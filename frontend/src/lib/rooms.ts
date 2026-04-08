import { fetchAuthSession } from "aws-amplify/auth";
import { getCollabHttpBaseUrl } from "./runtime-config";

const ROOM_GRANT_STORAGE_PREFIX = "codeduel.room-grant.";

export interface RoomGrant {
  roomId: string;
  roomAccessToken: string;
  role: "owner" | "participant";
  accessExpiresAt: string;
  roomExpiresAt: string;
  createdAt: string;
  ownerSub: string;
}

function normalizeRoomId(rawRoomId: string) {
  const normalized = rawRoomId.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(normalized)) {
    throw new Error("Room code must be 8 letters or numbers.");
  }

  return normalized;
}

async function getBearerToken() {
  const session = await fetchAuthSession();
  const token =
    session.tokens?.idToken?.toString() ??
    session.tokens?.accessToken?.toString();

  if (!token) {
    throw new Error("You must be signed in to access rooms.");
  }

  return token;
}

async function requestRoomGrant(path: string, method: "POST") {
  const bearerToken = await getBearerToken();
  const response = await fetch(`${getCollabHttpBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | RoomGrant
    | null;

  if (!response.ok) {
    throw new Error(
      (data && "error" in data && data.error) ||
        `Room request failed with status ${response.status}.`
    );
  }

  return data as RoomGrant;
}

export function persistRoomGrant(roomGrant: RoomGrant) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    `${ROOM_GRANT_STORAGE_PREFIX}${roomGrant.roomId}`,
    JSON.stringify(roomGrant)
  );
}

export function readRoomGrant(roomId: string) {
  if (typeof window === "undefined") return null;

  const storedGrant = window.sessionStorage.getItem(
    `${ROOM_GRANT_STORAGE_PREFIX}${roomId}`
  );
  if (!storedGrant) {
    return null;
  }

  try {
    const parsedGrant = JSON.parse(storedGrant) as RoomGrant;
    if (
      typeof parsedGrant.roomId !== "string" ||
      parsedGrant.roomId !== roomId ||
      typeof parsedGrant.roomAccessToken !== "string" ||
      typeof parsedGrant.accessExpiresAt !== "string"
    ) {
      throw new Error("Stored room grant is invalid.");
    }

    if (Date.parse(parsedGrant.accessExpiresAt) <= Date.now() + 10_000) {
      window.sessionStorage.removeItem(`${ROOM_GRANT_STORAGE_PREFIX}${roomId}`);
      return null;
    }

    return parsedGrant;
  } catch {
    window.sessionStorage.removeItem(`${ROOM_GRANT_STORAGE_PREFIX}${roomId}`);
    return null;
  }
}

export async function createRoom() {
  const roomGrant = await requestRoomGrant("/api/rooms", "POST");
  persistRoomGrant(roomGrant);
  return roomGrant;
}

export async function joinRoom(rawRoomId: string) {
  const roomId = normalizeRoomId(rawRoomId);
  const roomGrant = await requestRoomGrant(`/api/rooms/${roomId}/join`, "POST");
  persistRoomGrant(roomGrant);
  return roomGrant;
}

export { normalizeRoomId };
