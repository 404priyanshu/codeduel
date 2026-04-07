import { Amplify } from "aws-amplify";
import "aws-amplify/auth/enable-oauth-listener";

const DEFAULT_USER_POOL_ID = "us-east-1_9lrF660Dd";
const DEFAULT_USER_POOL_CLIENT_ID = "2b3o1ckl3t59dme9khiv8clf65";

const userPoolId =
    import.meta.env.VITE_USER_POOL_ID || DEFAULT_USER_POOL_ID;
const userPoolClientId =
    import.meta.env.VITE_USER_POOL_CLIENT_ID || DEFAULT_USER_POOL_CLIENT_ID;
const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
const configuredDomain = import.meta.env.VITE_COGNITO_DOMAIN?.trim();
const cognitoDomain = configuredDomain
    ? configuredDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : undefined;

function parseRedirectList(value: string | undefined, fallback: string[]) {
    if (!value) return fallback;

    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export const authRedirectSignIn = parseRedirectList(
    import.meta.env.VITE_AUTH_REDIRECT_SIGN_IN,
    [`${currentOrigin}/login`]
);
export const authRedirectSignOut = parseRedirectList(
    import.meta.env.VITE_AUTH_REDIRECT_SIGN_OUT,
    [`${currentOrigin}/`]
);
export const googleAuthEnabled = Boolean(cognitoDomain);

Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId,
            userPoolClientId,
            loginWith: {
                email: true,
                ...(cognitoDomain
                    ? {
                        oauth: {
                            domain: cognitoDomain,
                            scopes: ["openid", "email", "profile"],
                            redirectSignIn: authRedirectSignIn,
                            redirectSignOut: authRedirectSignOut,
                            responseType: "code" as const,
                            providers: ["Google" as const],
                        },
                    }
                    : {}),
            },
        },
    },
});
