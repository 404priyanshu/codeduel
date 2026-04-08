const DEFAULT_USER_POOL_ID = "us-east-1_9lrF660Dd";
const DEFAULT_USER_POOL_CLIENT_ID = "2b3o1ckl3t59dme9khiv8clf65";
const DEFAULT_COLLAB_WS_URL = "ws://localhost:1234";

type RuntimeConfigValue = string | string[] | null | undefined;

export interface RuntimeConfig {
  collabWsUrl: string;
  collabHttpUrl?: string;
  userPoolId: string;
  userPoolClientId: string;
  cognitoDomain?: string;
  authRedirectSignIn: string[];
  authRedirectSignOut: string[];
}

declare global {
  interface Window {
    __CODEDUEL_CONFIG__?: {
      collabWsUrl?: RuntimeConfigValue;
      collabHttpUrl?: RuntimeConfigValue;
      userPoolId?: RuntimeConfigValue;
      userPoolClientId?: RuntimeConfigValue;
      cognitoDomain?: RuntimeConfigValue;
      authRedirectSignIn?: RuntimeConfigValue;
      authRedirectSignOut?: RuntimeConfigValue;
    };
  }
}

let cachedRuntimeConfig: RuntimeConfig | null = null;

function normalizeString(value: RuntimeConfigValue) {
  return typeof value === "string" ? value.trim() : "";
}

function parseRedirectList(value: RuntimeConfigValue, fallback: string[]) {
  if (Array.isArray(value)) {
    const normalized = value.map((entry) => `${entry}`.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }

  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return fallback;
  }

  return normalizedValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeDomain(value: RuntimeConfigValue) {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return undefined;
  }

  return normalizedValue.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getCurrentOrigin() {
  return typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5173";
}

export function getRuntimeConfig() {
  if (cachedRuntimeConfig) {
    return cachedRuntimeConfig;
  }

  const runtimeConfig =
    typeof window !== "undefined" ? window.__CODEDUEL_CONFIG__ ?? {} : {};
  const currentOrigin = getCurrentOrigin();

  const collabWsUrl =
    normalizeString(runtimeConfig.collabWsUrl) ||
    import.meta.env.VITE_COLLAB_WS_URL ||
    DEFAULT_COLLAB_WS_URL;
  const collabHttpUrl =
    normalizeString(runtimeConfig.collabHttpUrl) ||
    import.meta.env.VITE_COLLAB_HTTP_URL ||
    undefined;
  const userPoolId =
    normalizeString(runtimeConfig.userPoolId) ||
    import.meta.env.VITE_USER_POOL_ID ||
    DEFAULT_USER_POOL_ID;
  const userPoolClientId =
    normalizeString(runtimeConfig.userPoolClientId) ||
    import.meta.env.VITE_USER_POOL_CLIENT_ID ||
    DEFAULT_USER_POOL_CLIENT_ID;
  const cognitoDomain =
    normalizeDomain(runtimeConfig.cognitoDomain) ||
    normalizeDomain(import.meta.env.VITE_COGNITO_DOMAIN);

  cachedRuntimeConfig = {
    collabWsUrl,
    collabHttpUrl,
    userPoolId,
    userPoolClientId,
    cognitoDomain,
    authRedirectSignIn: parseRedirectList(
      runtimeConfig.authRedirectSignIn ||
        import.meta.env.VITE_AUTH_REDIRECT_SIGN_IN,
      [`${currentOrigin}/login`]
    ),
    authRedirectSignOut: parseRedirectList(
      runtimeConfig.authRedirectSignOut ||
        import.meta.env.VITE_AUTH_REDIRECT_SIGN_OUT,
      [`${currentOrigin}/`]
    ),
  };

  return cachedRuntimeConfig;
}

export function getCollabHttpBaseUrl() {
  const { collabHttpUrl, collabWsUrl } = getRuntimeConfig();
  if (collabHttpUrl) {
    return collabHttpUrl.replace(/\/$/, "");
  }

  const url = new URL(collabWsUrl);
  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function getCollabWsUrl() {
  return getRuntimeConfig().collabWsUrl;
}
