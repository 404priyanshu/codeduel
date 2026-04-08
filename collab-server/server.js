import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import {
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { verifyCognitoAuthorizationHeader } from "./cognito.js";
import { signRoomAccessToken, verifyRoomAccessToken } from "./room-tokens.js";

function parseIntegerEnv(name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = parseInt(process.env[name] || `${fallback}`, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(
      `Environment variable ${name} must be an integer between ${min} and ${max}.`
    );
  }

  return parsed;
}

function parseAllowedOrigins(rawValue) {
  const values = `${rawValue || ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.includes("*") && values.length > 1) {
    throw new Error(
      "Allowed origins cannot combine '*' with explicit origins."
    );
  }

  return new Set(values);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";
const DEFAULT_ROOM_TOKEN_SECRET = "codeduel-dev-room-secret-change-me";
const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseIntegerEnv("PORT", 1234, { min: 1, max: 65535 });
const SERVER_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DISABLE_PERSISTENCE = /^(1|true|yes)$/i.test(
  process.env.DISABLE_PERSISTENCE || ""
);
const PERSISTENCE_DIR = path.resolve(
  SERVER_ROOT,
  process.env.YDOCS_DIR || "./data"
);
const PERSISTENCE_FLUSH_DEBOUNCE_MS = parseIntegerEnv(
  "PERSISTENCE_FLUSH_DEBOUNCE_MS",
  750,
  { min: 50 }
);
const DEFAULT_DOCUMENT_TEXT =
  process.env.CODEDUEL_EDITOR_TEMPLATE || "// Start coding here\n";
const MAX_PAYLOAD_BYTES = parseIntegerEnv(
  "MAX_PAYLOAD_BYTES",
  16 * 1024 * 1024,
  { min: 1024 }
);
const GC_ENABLED = !/^(0|false)$/i.test(process.env.GC || "");
const PING_TIMEOUT_MS = parseIntegerEnv("PING_TIMEOUT_MS", 30000, {
  min: 1000,
});
const ROOM_TTL_MS = parseIntegerEnv(
  "ROOM_TTL_MS",
  24 * 60 * 60 * 1000,
  { min: 60_000 }
);
const ROOM_ACCESS_TOKEN_TTL_MS = parseIntegerEnv(
  "ROOM_ACCESS_TOKEN_TTL_MS",
  12 * 60 * 60 * 1000,
  { min: 60_000 }
);
const ROOM_SWEEP_INTERVAL_MS = parseIntegerEnv(
  "ROOM_SWEEP_INTERVAL_MS",
  60_000,
  { min: 5_000 }
);
const SHUTDOWN_GRACE_MS = parseIntegerEnv("SHUTDOWN_GRACE_MS", 15_000, {
  min: 1_000,
});
const ROOM_TOKEN_SECRET =
  process.env.ROOM_TOKEN_SECRET || DEFAULT_ROOM_TOKEN_SECRET;
const ROOM_ID_LENGTH = parseIntegerEnv("ROOM_ID_LENGTH", 8, {
  min: 4,
  max: 16,
});
const ALLOWED_ORIGINS = parseAllowedOrigins(
  process.env.CORS_ALLOW_ORIGINS ??
    process.env.CORS_ALLOW_ORIGIN ??
    (IS_PRODUCTION ? "" : "*")
);
const ROOM_ID_PATTERN = new RegExp(`^[A-Z0-9]{${ROOM_ID_LENGTH}}$`);
const ROOM_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOMS_FILE_PATH = path.join(PERSISTENCE_DIR, "_rooms.json");

const docs = new Map();
const roomStore = new Map();
const flushTimers = new Map();
let roomsFlushTimer = null;
let isShuttingDown = false;
let shutdownPromise = null;
const startedAt = Date.now();

const messageSync = 0;
const messageAwareness = 1;

function assertRuntimeConfig() {
  if (ROOM_ACCESS_TOKEN_TTL_MS > ROOM_TTL_MS) {
    throw new Error(
      "ROOM_ACCESS_TOKEN_TTL_MS must be less than or equal to ROOM_TTL_MS."
    );
  }

  if (!IS_PRODUCTION) {
    return;
  }

  if (ROOM_TOKEN_SECRET === DEFAULT_ROOM_TOKEN_SECRET) {
    throw new Error("ROOM_TOKEN_SECRET must be set explicitly in production.");
  }

  if (ROOM_TOKEN_SECRET.length < 32) {
    throw new Error(
      "ROOM_TOKEN_SECRET must be at least 32 characters long in production."
    );
  }

  if (ALLOWED_ORIGINS.size === 0 || ALLOWED_ORIGINS.has("*")) {
    throw new Error(
      "CORS_ALLOW_ORIGINS must list one or more explicit origins in production."
    );
  }
}

function logRuntimeWarnings() {
  if (ROOM_TOKEN_SECRET === DEFAULT_ROOM_TOKEN_SECRET) {
    console.warn(
      "Using the built-in ROOM_TOKEN_SECRET. Set ROOM_TOKEN_SECRET before exposing this server outside local development."
    );
  }

  if (ALLOWED_ORIGINS.has("*")) {
    console.warn(
      "Allowing all origins. Restrict CORS_ALLOW_ORIGINS before deploying publicly."
    );
  }

  if (DISABLE_PERSISTENCE) {
    console.warn(
      "Document persistence is disabled. Room state will be lost on restart."
    );
  }
}

assertRuntimeConfig();
logRuntimeWarnings();

if (!DISABLE_PERSISTENCE) {
  mkdirSync(PERSISTENCE_DIR, { recursive: true });
  loadPersistedRooms();
}

function getDocStats() {
  let connections = 0;
  for (const doc of docs.values()) {
    connections += doc.conns.size;
  }

  return {
    rooms: docs.size,
    authorizedRooms: roomStore.size,
    connections,
    persistence: !DISABLE_PERSISTENCE,
    nodeEnv: NODE_ENV,
    shuttingDown: isShuttingDown,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
  };
}

function getDocFilePath(docName) {
  const digest = createHash("sha256").update(docName).digest("hex");
  return path.join(PERSISTENCE_DIR, `${digest}.bin`);
}

function persistDocNow(docName, doc) {
  clearFlushTimer(docName);
  return flushDoc(docName, doc).catch((error) => {
    console.error(`Failed to persist room "${docName}"`, error);
  });
}

function seedEditorText(doc) {
  const text = doc.getText("monaco");
  if (text.length === 0 && DEFAULT_DOCUMENT_TEXT.length > 0) {
    text.insert(0, DEFAULT_DOCUMENT_TEXT);
  }
}

async function flushDoc(docName, doc) {
  if (doc.isDestroyed || DISABLE_PERSISTENCE) {
    return;
  }

  const filePath = getDocFilePath(docName);
  const tempPath = `${filePath}.tmp`;
  const update = Buffer.from(Y.encodeStateAsUpdate(doc));

  await writeFile(tempPath, update);
  await rename(tempPath, filePath);
}

function clearFlushTimer(docName) {
  const timer = flushTimers.get(docName);
  if (timer) {
    clearTimeout(timer);
    flushTimers.delete(docName);
  }
}

function scheduleFlush(docName, doc) {
  clearFlushTimer(docName);

  const timer = setTimeout(async () => {
    flushTimers.delete(docName);
    try {
      await flushDoc(docName, doc);
    } catch (error) {
      console.error(`Failed to persist room "${docName}"`, error);
    }
  }, PERSISTENCE_FLUSH_DEBOUNCE_MS);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  flushTimers.set(docName, timer);
}

function loadPersistedDoc(docName, doc) {
  if (DISABLE_PERSISTENCE) {
    seedEditorText(doc);
    return;
  }

  const filePath = getDocFilePath(docName);
  if (existsSync(filePath)) {
    const update = readFileSync(filePath);
    if (update.length > 0) {
      Y.applyUpdate(doc, new Uint8Array(update));
    }
  }

  seedEditorText(doc);
  doc.on("update", () => scheduleFlush(docName, doc));
}

function parseDocName(requestUrl = "/") {
  const url = new URL(requestUrl, "http://localhost");
  return decodeURIComponent(url.pathname.slice(1)) || "default";
}

function getRequestOrigin(request) {
  const header = request?.headers?.origin;
  return typeof header === "string" && header.length > 0 ? header : null;
}

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  return ALLOWED_ORIGINS.has("*") || ALLOWED_ORIGINS.has(origin);
}

function getResponseOrigin(origin) {
  if (ALLOWED_ORIGINS.has("*")) {
    return "*";
  }

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }

  return null;
}

function normalizeRoomId(rawRoomId) {
  const normalized = `${rawRoomId || ""}`.trim().toUpperCase();
  if (!ROOM_ID_PATTERN.test(normalized)) {
    throw new Error(`Room code must be ${ROOM_ID_LENGTH} uppercase letters or numbers.`);
  }

  return normalized;
}

function randomRoomId() {
  const bytes = randomBytes(ROOM_ID_LENGTH);
  let value = "";

  for (let index = 0; index < ROOM_ID_LENGTH; index += 1) {
    value += ROOM_ID_ALPHABET[bytes[index] % ROOM_ID_ALPHABET.length];
  }

  return value;
}

function generateRoomId() {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const roomId = randomRoomId();
    if (!roomStore.has(roomId)) {
      return roomId;
    }
  }

  throw new Error("Unable to generate a unique room code.");
}

function nowIso() {
  return new Date().toISOString();
}

function getRoomExpiryIso() {
  return new Date(Date.now() + ROOM_TTL_MS).toISOString();
}

function getAccessExpiryIso() {
  return new Date(Date.now() + ROOM_ACCESS_TOKEN_TTL_MS).toISOString();
}

function roomToSerializable(room) {
  return {
    ...room,
    members: Object.values(room.members),
  };
}

function scheduleRoomsFlush() {
  if (DISABLE_PERSISTENCE) {
    return;
  }

  if (roomsFlushTimer) {
    clearTimeout(roomsFlushTimer);
  }

  roomsFlushTimer = setTimeout(async () => {
    roomsFlushTimer = null;
    try {
      await flushRoomsNow();
    } catch (error) {
      console.error("Failed to persist room metadata", error);
    }
  }, PERSISTENCE_FLUSH_DEBOUNCE_MS);

  if (typeof roomsFlushTimer.unref === "function") {
    roomsFlushTimer.unref();
  }
}

async function flushRoomsNow() {
  if (DISABLE_PERSISTENCE) {
    return;
  }

  if (roomsFlushTimer) {
    clearTimeout(roomsFlushTimer);
    roomsFlushTimer = null;
  }

  const tempPath = `${ROOMS_FILE_PATH}.tmp`;
  const payload = JSON.stringify(
    {
      rooms: Array.from(roomStore.values()).map(roomToSerializable),
    },
    null,
    2
  );

  await writeFile(tempPath, payload);
  await rename(tempPath, ROOMS_FILE_PATH);
}

function loadPersistedRooms() {
  if (!existsSync(ROOMS_FILE_PATH)) {
    return;
  }

  try {
    const contents = readFileSync(ROOMS_FILE_PATH, "utf8");
    if (!contents.trim()) {
      return;
    }

    const parsed = JSON.parse(contents);
    const storedRooms = Array.isArray(parsed?.rooms) ? parsed.rooms : [];
    const now = Date.now();

    for (const storedRoom of storedRooms) {
      if (
        typeof storedRoom?.roomId !== "string" ||
        typeof storedRoom?.ownerSub !== "string" ||
        typeof storedRoom?.expiresAt !== "string"
      ) {
        continue;
      }

      const expiresAt = Date.parse(storedRoom.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        continue;
      }

      const members = {};
      const storedMembers = Array.isArray(storedRoom.members)
        ? storedRoom.members
        : [];

      for (const member of storedMembers) {
        if (typeof member?.sub !== "string" || typeof member?.role !== "string") {
          continue;
        }

        members[member.sub] = {
          sub: member.sub,
          role: member.role,
          email: typeof member.email === "string" ? member.email : null,
          username: typeof member.username === "string" ? member.username : null,
          joinedAt:
            typeof member.joinedAt === "string" ? member.joinedAt : storedRoom.createdAt,
          lastAuthorizedAt:
            typeof member.lastAuthorizedAt === "string"
              ? member.lastAuthorizedAt
              : storedRoom.updatedAt,
        };
      }

      roomStore.set(storedRoom.roomId, {
        roomId: storedRoom.roomId,
        ownerSub: storedRoom.ownerSub,
        createdAt:
          typeof storedRoom.createdAt === "string"
            ? storedRoom.createdAt
            : nowIso(),
        updatedAt:
          typeof storedRoom.updatedAt === "string"
            ? storedRoom.updatedAt
            : nowIso(),
        expiresAt: storedRoom.expiresAt,
        members,
      });
    }
  } catch (error) {
    console.error("Failed to load persisted room metadata", error);
  }
}

function touchRoom(room) {
  room.updatedAt = nowIso();
  room.expiresAt = getRoomExpiryIso();
}

function ensureRoomMember(room, user, preferredRole = "participant") {
  const existingMember = room.members[user.sub];
  if (existingMember) {
    existingMember.email = user.email ?? existingMember.email;
    existingMember.username = user.username ?? existingMember.username;
    existingMember.lastAuthorizedAt = nowIso();
    touchRoom(room);
    scheduleRoomsFlush();
    return existingMember;
  }

  const member = {
    sub: user.sub,
    role: preferredRole,
    email: user.email,
    username: user.username,
    joinedAt: nowIso(),
    lastAuthorizedAt: nowIso(),
  };

  room.members[user.sub] = member;
  touchRoom(room);
  scheduleRoomsFlush();
  return member;
}

function createRoomForUser(user) {
  const timestamp = nowIso();
  const roomId = generateRoomId();
  const room = {
    roomId,
    ownerSub: user.sub,
    createdAt: timestamp,
    updatedAt: timestamp,
    expiresAt: getRoomExpiryIso(),
    members: {
      [user.sub]: {
        sub: user.sub,
        role: "owner",
        email: user.email,
        username: user.username,
        joinedAt: timestamp,
        lastAuthorizedAt: timestamp,
      },
    },
  };

  roomStore.set(roomId, room);
  scheduleRoomsFlush();
  return room;
}

function buildRoomGrant(room, member) {
  const accessExpiresAt = getAccessExpiryIso();
  const roomAccessToken = signRoomAccessToken(
    {
      rid: room.roomId,
      sub: member.sub,
      role: member.role,
      exp: Math.floor(Date.parse(accessExpiresAt) / 1000),
      iat: Math.floor(Date.now() / 1000),
    },
    ROOM_TOKEN_SECRET
  );

  return {
    roomId: room.roomId,
    roomAccessToken,
    role: member.role,
    accessExpiresAt,
    roomExpiresAt: room.expiresAt,
  };
}

async function removePersistedDoc(roomId) {
  if (DISABLE_PERSISTENCE) {
    return;
  }

  try {
    await unlink(getDocFilePath(roomId));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.error(`Failed to remove persisted room snapshot for "${roomId}"`, error);
    }
  }
}

function pruneExpiredRooms() {
  const now = Date.now();
  let removedRooms = false;

  for (const [roomId, room] of roomStore.entries()) {
    const expiresAt = Date.parse(room.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt > now) {
      continue;
    }

    removedRooms = true;
    roomStore.delete(roomId);
    void removePersistedDoc(roomId);
  }

  if (removedRooms) {
    scheduleRoomsFlush();
  }
}

function getRoom(roomId) {
  pruneExpiredRooms();
  return roomStore.get(roomId) || null;
}

function send(doc, connection, message) {
  if (
    connection.readyState !== connection.OPEN &&
    connection.readyState !== connection.CONNECTING
  ) {
    closeConnection(doc, connection);
    return;
  }

  connection.send(message, (error) => {
    if (error) {
      closeConnection(doc, connection);
    }
  });
}

function broadcastDocUpdate(doc, update) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeUpdate(encoder, update);
  const message = encoding.toUint8Array(encoder);

  doc.conns.forEach((_, connection) => {
    send(doc, connection, message);
  });
}

class WSSharedDoc extends Y.Doc {
  constructor(name) {
    super({ gc: GC_ENABLED });
    this.name = name;
    this.conns = new Map();
    this.awareness = new awarenessProtocol.Awareness(this);
    this.awareness.setLocalState(null);

    this.on("update", (update) => {
      broadcastDocUpdate(this, update);
    });

    this.awareness.on("update", ({ added, updated, removed }, connection) => {
      const changedClients = added.concat(updated, removed);

      if (connection !== null) {
        const controlledIds = this.conns.get(connection);
        if (controlledIds) {
          added.forEach((clientId) => controlledIds.add(clientId));
          removed.forEach((clientId) => controlledIds.delete(clientId));
        }
      }

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
      );
      const message = encoding.toUint8Array(encoder);

      this.conns.forEach((_, currentConnection) => {
        send(this, currentConnection, message);
      });
    });

    loadPersistedDoc(name, this);
  }
}

function getDoc(docName) {
  const existingDoc = docs.get(docName);
  if (existingDoc) {
    return existingDoc;
  }

  const doc = new WSSharedDoc(docName);
  docs.set(docName, doc);
  return doc;
}

function closeConnection(doc, connection) {
  if (!doc.conns.has(connection)) {
    return;
  }

  const controlledIds = doc.conns.get(connection) || new Set();
  doc.conns.delete(connection);

  if (controlledIds.size > 0) {
    awarenessProtocol.removeAwarenessStates(
      doc.awareness,
      Array.from(controlledIds),
      null
    );
  }

  if (doc.conns.size === 0) {
    if (!DISABLE_PERSISTENCE) {
      void persistDocNow(doc.name, doc);
    }
    docs.delete(doc.name);
    doc.destroy();
  }

  if (
    connection.readyState === connection.OPEN ||
    connection.readyState === connection.CONNECTING
  ) {
    try {
      connection.close();
    } catch {
      // Ignore close errors during teardown.
    }
  }
}

function handleMessage(connection, doc, message) {
  const decoder = decoding.createDecoder(new Uint8Array(message));
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case messageSync:
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.readSyncMessage(decoder, encoder, doc, connection);
      if (encoding.length(encoder) > 1) {
        send(doc, connection, encoding.toUint8Array(encoder));
      }
      break;
    case messageAwareness:
      awarenessProtocol.applyAwarenessUpdate(
        doc.awareness,
        decoding.readVarUint8Array(decoder),
        connection
      );
      break;
    default:
      break;
  }
}

function setupWSConnection(connection, request) {
  const roomId = parseDocName(request.url);
  const doc = getDoc(roomId);
  doc.conns.set(connection, new Set());
  connection.binaryType = "arraybuffer";

  connection.on("message", (message) => {
    try {
      handleMessage(connection, doc, message);
    } catch (error) {
      console.error(`Failed to process websocket message for "${doc.name}"`, error);
      closeConnection(doc, connection);
    }
  });

  connection.on("error", () => {
    closeConnection(doc, connection);
  });

  let pongReceived = true;
  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      clearInterval(pingInterval);
      closeConnection(doc, connection);
      return;
    }

    pongReceived = false;
    try {
      connection.ping();
    } catch {
      clearInterval(pingInterval);
      closeConnection(doc, connection);
    }
  }, PING_TIMEOUT_MS);

  if (typeof pingInterval.unref === "function") {
    pingInterval.unref();
  }

  connection.on("pong", () => {
    pongReceived = true;
  });

  connection.on("close", () => {
    clearInterval(pingInterval);
    closeConnection(doc, connection);
  });

  const syncEncoder = encoding.createEncoder();
  encoding.writeVarUint(syncEncoder, messageSync);
  syncProtocol.writeSyncStep1(syncEncoder, doc);
  send(doc, connection, encoding.toUint8Array(syncEncoder));

  const awarenessStates = doc.awareness.getStates();
  if (awarenessStates.size > 0) {
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, messageAwareness);
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(
        doc.awareness,
        Array.from(awarenessStates.keys())
      )
    );
    send(doc, connection, encoding.toUint8Array(awarenessEncoder));
  }
}

function corsHeaders(origin = null) {
  const allowOrigin = getResponseOrigin(origin);
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    Vary: "Origin",
  };

  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }

  return headers;
}

function sendJson(response, statusCode, payload, request = null) {
  response.writeHead(statusCode, {
    ...corsHeaders(getRequestOrigin(request)),
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function sendNotFound(response, request = null) {
  sendJson(response, 404, { error: "Not found." }, request);
}

function sendUnauthorized(response, error, request = null) {
  sendJson(
    response,
    401,
    { error: error.message || "Unauthorized." },
    request
  );
}

function sendForbidden(response, error, request = null) {
  sendJson(
    response,
    403,
    { error: error.message || "Forbidden." },
    request
  );
}

function sendServiceUnavailable(response, request = null) {
  sendJson(response, 503, { error: "Server is shutting down." }, request);
}

function ensureAllowedOrigin(request, response) {
  const origin = getRequestOrigin(request);
  if (!origin || isOriginAllowed(origin)) {
    return true;
  }

  sendForbidden(response, new Error("Origin is not allowed."), request);
  return false;
}

async function authenticateRequest(request) {
  return verifyCognitoAuthorizationHeader(request.headers.authorization);
}

async function handleCreateRoom(request, response) {
  try {
    const user = await authenticateRequest(request);
    const room = createRoomForUser(user);
    const grant = buildRoomGrant(room, room.members[user.sub]);

    sendJson(
      response,
      201,
      {
        ...grant,
        createdAt: room.createdAt,
        ownerSub: room.ownerSub,
      },
      request
    );
  } catch (error) {
    sendUnauthorized(response, error, request);
  }
}

async function handleJoinRoom(request, response, rawRoomId) {
  let roomId;

  try {
    roomId = normalizeRoomId(rawRoomId);
  } catch (error) {
    sendJson(response, 400, { error: error.message }, request);
    return;
  }

  const room = getRoom(roomId);
  if (!room) {
    sendJson(response, 404, { error: "Room not found or expired." }, request);
    return;
  }

  try {
    const user = await authenticateRequest(request);
    const member = ensureRoomMember(room, user, "participant");
    const grant = buildRoomGrant(room, member);

    sendJson(
      response,
      200,
      {
        ...grant,
        createdAt: room.createdAt,
        ownerSub: room.ownerSub,
      },
      request
    );
  } catch (error) {
    sendUnauthorized(response, error, request);
  }
}

async function flushAllDocs() {
  await Promise.all(
    Array.from(docs.values()).map((doc) => {
      if (DISABLE_PERSISTENCE) {
        return Promise.resolve();
      }

      return persistDocNow(doc.name, doc);
    })
  );
}

function rejectUpgrade(socket, statusCode, message) {
  const statusText = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    503: "Service Unavailable",
  }[statusCode] || "Bad Request";

  socket.write(
    [
      `HTTP/1.1 ${statusCode} ${statusText}`,
      "Connection: close",
      "Content-Type: application/json",
      `Content-Length: ${Buffer.byteLength(message)}`,
      "",
      message,
    ].join("\r\n")
  );
  socket.destroy();
}

function authorizeUpgrade(request) {
  if (isShuttingDown) {
    return {
      ok: false,
      statusCode: 503,
      message: JSON.stringify({ error: "Server is shutting down." }),
    };
  }

  const origin = getRequestOrigin(request);
  if (origin && !isOriginAllowed(origin)) {
    return {
      ok: false,
      statusCode: 403,
      message: JSON.stringify({ error: "Origin is not allowed." }),
    };
  }

  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`
  );
  const roomId = parseDocName(request.url);

  try {
    normalizeRoomId(roomId);
  } catch (error) {
    return { ok: false, statusCode: 400, message: JSON.stringify({ error: error.message }) };
  }

  const room = getRoom(roomId);
  if (!room) {
    return {
      ok: false,
      statusCode: 401,
      message: JSON.stringify({ error: "Room access is no longer valid." }),
    };
  }

  const roomAccessToken = url.searchParams.get("roomAccessToken");
  if (!roomAccessToken) {
    return {
      ok: false,
      statusCode: 401,
      message: JSON.stringify({ error: "Missing room access token." }),
    };
  }

  try {
    const payload = verifyRoomAccessToken(roomAccessToken, ROOM_TOKEN_SECRET);
    if (payload.rid !== roomId) {
      throw new Error("Room access token does not match the requested room.");
    }

    const member = room.members[payload.sub];
    if (!member) {
      throw new Error("Room member is no longer authorized.");
    }

    member.lastAuthorizedAt = nowIso();
    touchRoom(room);
    scheduleRoomsFlush();

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      statusCode: 401,
      message: JSON.stringify({ error: error.message || "Unauthorized room access." }),
    };
  }
}

const roomSweepInterval = setInterval(() => {
  try {
    pruneExpiredRooms();
  } catch (error) {
    console.error("Failed to prune expired rooms", error);
  }
}, ROOM_SWEEP_INTERVAL_MS);

if (typeof roomSweepInterval.unref === "function") {
  roomSweepInterval.unref();
}

const server = http.createServer((request, response) => {
  void (async () => {
    const url = new URL(
      request.url || "/",
      `http://${request.headers.host || "localhost"}`
    );

    if (!ensureAllowedOrigin(request, response)) {
      return;
    }

    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders(getRequestOrigin(request)));
      response.end();
      return;
    }

    if (url.pathname === "/" || url.pathname === "/healthz") {
      sendJson(
        response,
        200,
        {
          status: "ok",
          host: HOST,
          port: PORT,
          ...getDocStats(),
        },
        request
      );
      return;
    }

    if (url.pathname === "/readyz") {
      sendJson(
        response,
        isShuttingDown ? 503 : 200,
        {
          status: isShuttingDown ? "draining" : "ready",
          host: HOST,
          port: PORT,
          ...getDocStats(),
        },
        request
      );
      return;
    }

    if (isShuttingDown) {
      sendServiceUnavailable(response, request);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      await handleCreateRoom(request, response);
      return;
    }

    const joinMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/join$/);
    if (request.method === "POST" && joinMatch) {
      await handleJoinRoom(request, response, joinMatch[1]);
      return;
    }

    sendNotFound(response, request);
  })().catch((error) => {
    console.error("Unhandled collab-server request error", error);
    sendJson(response, 500, { error: "Internal server error." }, request);
  });
});

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: MAX_PAYLOAD_BYTES,
  perMessageDeflate: false,
});

async function closeWebSocketClients() {
  await Promise.all(
    Array.from(wss.clients).map(
      (connection) =>
        new Promise((resolve) => {
          if (
            connection.readyState !== connection.OPEN &&
            connection.readyState !== connection.CONNECTING
          ) {
            resolve();
            return;
          }

          const timeout = setTimeout(resolve, 1000);
          if (typeof timeout.unref === "function") {
            timeout.unref();
          }

          connection.once("close", () => {
            clearTimeout(timeout);
            resolve();
          });

          try {
            connection.close(1012, "Server restarting");
          } catch {
            clearTimeout(timeout);
            resolve();
          }
        })
    )
  );
}

async function shutdownServer(reason, exitCode = 0) {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  isShuttingDown = true;
  console.log(`Shutting down CodeDuel collab server (${reason})...`);

  shutdownPromise = (async () => {
    const forceExitTimer = setTimeout(() => {
      console.error(
        `Forced collab-server shutdown after ${SHUTDOWN_GRACE_MS}ms.`
      );
      process.exit(exitCode === 0 ? 1 : exitCode);
    }, SHUTDOWN_GRACE_MS);

    if (typeof forceExitTimer.unref === "function") {
      forceExitTimer.unref();
    }

    try {
      const shutdownResults = await Promise.allSettled([
        new Promise((resolve, reject) => {
          if (!server.listening) {
            resolve();
            return;
          }

          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        }),
        closeWebSocketClients(),
        flushAllDocs(),
        flushRoomsNow().catch((error) => {
          console.error("Failed to flush room metadata during shutdown", error);
        }),
      ]);

      shutdownResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Collab-server shutdown task failed", result.reason);
        }
      });

      clearTimeout(forceExitTimer);
      process.exit(exitCode);
    } catch (error) {
      clearTimeout(forceExitTimer);
      console.error("Failed to shut down collab-server cleanly", error);
      process.exit(exitCode === 0 ? 1 : exitCode);
    }
  })();

  return shutdownPromise;
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`
  );

  if (
    url.pathname === "/" ||
    url.pathname === "/healthz" ||
    url.pathname === "/readyz" ||
    url.pathname.startsWith("/api/")
  ) {
    socket.destroy();
    return;
  }

  const authorization = authorizeUpgrade(request);
  if (!authorization.ok) {
    rejectUpgrade(socket, authorization.statusCode, authorization.message);
    return;
  }

  wss.handleUpgrade(request, socket, head, (connection) => {
    setupWSConnection(connection, request);
  });
});

server.on("error", (error) => {
  console.error("Collab-server listener error", error);
  void shutdownServer("listener error", 1);
});

server.listen(PORT, HOST, () => {
  console.log(
    `CodeDuel collab server listening on http://${HOST}:${PORT} ` +
      `(persistence ${DISABLE_PERSISTENCE ? "disabled" : `at ${PERSISTENCE_DIR}`}, ` +
      `origins ${
        ALLOWED_ORIGINS.has("*")
          ? "*"
          : Array.from(ALLOWED_ORIGINS).join(", ") || "none"
      })`
  );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    void shutdownServer(signal, 0);
  });
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection in collab-server", reason);
  void shutdownServer("unhandled rejection", 1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in collab-server", error);
  void shutdownServer("uncaught exception", 1);
});
