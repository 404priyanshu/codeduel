import { createRemoteJWKSet, jwtVerify } from "jose";

const DEFAULT_USER_POOL_ID = "us-east-1_9lrF660Dd";
const DEFAULT_USER_POOL_CLIENT_ID = "2b3o1ckl3t59dme9khiv8clf65";

const userPoolId = process.env.COGNITO_USER_POOL_ID || DEFAULT_USER_POOL_ID;
const userPoolClientId =
  process.env.COGNITO_USER_POOL_CLIENT_ID || DEFAULT_USER_POOL_CLIENT_ID;
const userPoolRegion = userPoolId.split("_")[0];
const issuer =
  process.env.COGNITO_ISSUER ||
  `https://cognito-idp.${userPoolRegion}.amazonaws.com/${userPoolId}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

function parseAuthorizationHeader(authorizationHeader) {
  if (typeof authorizationHeader !== "string") {
    throw new Error("Missing Authorization header.");
  }

  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    throw new Error("Authorization header must use Bearer token format.");
  }

  return token;
}

export async function verifyCognitoAuthorizationHeader(authorizationHeader) {
  const token = parseAuthorizationHeader(authorizationHeader);
  const { payload } = await jwtVerify(token, jwks, { issuer });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Authenticated token is missing a valid subject.");
  }

  const tokenUse =
    typeof payload.token_use === "string" ? payload.token_use : undefined;

  if (tokenUse === "id") {
    if (payload.aud !== userPoolClientId) {
      throw new Error("Token audience does not match the configured user pool client.");
    }
  } else if (tokenUse === "access") {
    if (payload.client_id !== userPoolClientId) {
      throw new Error("Token client_id does not match the configured user pool client.");
    }
  } else if (tokenUse) {
    throw new Error(`Unsupported Cognito token_use "${tokenUse}".`);
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    username:
      typeof payload["cognito:username"] === "string"
        ? payload["cognito:username"]
        : typeof payload.username === "string"
          ? payload.username
          : null,
    tokenUse: tokenUse || "unknown",
    issuer,
    userPoolId,
  };
}
