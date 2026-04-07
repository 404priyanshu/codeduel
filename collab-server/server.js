import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync } from "node:fs";
import { writeFile, rename } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = parseInt(process.env.PORT || "1234", 10);
const DISABLE_PERSISTENCE = /^(1|true|yes)$/i.test(
    process.env.DISABLE_PERSISTENCE || ""
);
const PERSISTENCE_DIR = path.resolve(
    process.cwd(),
    process.env.YDOCS_DIR || "./data"
);
const PERSISTENCE_FLUSH_DEBOUNCE_MS = parseInt(
    process.env.PERSISTENCE_FLUSH_DEBOUNCE_MS || "750",
    10
);
const DEFAULT_DOCUMENT_TEXT =
    process.env.CODEDUEL_EDITOR_TEMPLATE || "// Start coding here\n";
const MAX_PAYLOAD_BYTES = parseInt(
    process.env.MAX_PAYLOAD_BYTES || `${16 * 1024 * 1024}`,
    10
);
const GC_ENABLED = !/^(0|false)$/i.test(process.env.GC || "");
const PING_TIMEOUT_MS = parseInt(process.env.PING_TIMEOUT_MS || "30000", 10);

const docs = new Map();
const flushTimers = new Map();
const messageSync = 0;
const messageAwareness = 1;

function getDocStats() {
    let connections = 0;
    for (const doc of docs.values()) {
        connections += doc.conns.size;
    }
    return {
        rooms: docs.size,
        connections,
        persistence: !DISABLE_PERSISTENCE,
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
    if (doc.isDestroyed) {
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

if (!DISABLE_PERSISTENCE) {
    mkdirSync(PERSISTENCE_DIR, { recursive: true });
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
    const doc = getDoc(parseDocName(request.url));
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

const server = http.createServer((request, response) => {
    const url = new URL(
        request.url || "/",
        `http://${request.headers.host || "localhost"}`
    );

    if (
        url.pathname === "/" ||
        url.pathname === "/healthz" ||
        url.pathname === "/readyz"
    ) {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(
            JSON.stringify({
                status: "ok",
                host: HOST,
                port: PORT,
                ...getDocStats(),
            })
        );
        return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_PAYLOAD_BYTES,
    perMessageDeflate: false,
});

server.on("upgrade", (request, socket, head) => {
    const url = new URL(
        request.url || "/",
        `http://${request.headers.host || "localhost"}`
    );

    if (
        url.pathname === "/" ||
        url.pathname === "/healthz" ||
        url.pathname === "/readyz"
    ) {
        socket.destroy();
        return;
    }

    wss.handleUpgrade(request, socket, head, (connection) => {
        setupWSConnection(connection, request);
    });
});

server.listen(PORT, HOST, () => {
    console.log(
        `CodeDuel collab server listening on http://${HOST}:${PORT} ` +
        `(persistence ${DISABLE_PERSISTENCE ? "disabled" : `at ${PERSISTENCE_DIR}`})`
    );
});

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, async () => {
        await flushAllDocs();
        process.exit(0);
    });
}
