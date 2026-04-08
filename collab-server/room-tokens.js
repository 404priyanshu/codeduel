import { createHmac, timingSafeEqual } from "node:crypto";

function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decodeSegment(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function createSignature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signaturesMatch(expected, actual) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function signRoomAccessToken(payload, secret) {
  const header = encodeSegment({ alg: "HS256", typ: "JWT" });
  const body = encodeSegment(payload);
  const signature = createSignature(`${header}.${body}`, secret);

  return `${header}.${body}.${signature}`;
}

export function verifyRoomAccessToken(token, secret) {
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Missing room access token.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Room access token has an invalid format.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = createSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );

  if (!signaturesMatch(expectedSignature, signature)) {
    throw new Error("Room access token signature is invalid.");
  }

  const header = decodeSegment(encodedHeader);
  if (header.alg !== "HS256") {
    throw new Error("Unsupported room access token algorithm.");
  }

  const payload = decodeSegment(encodedPayload);
  const expiresAt = typeof payload.exp === "number" ? payload.exp : null;
  if (!expiresAt || expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("Room access token has expired.");
  }

  return payload;
}
