import { Amplify } from "aws-amplify";
import "aws-amplify/auth/enable-oauth-listener";
import { getRuntimeConfig } from "./runtime-config";

let authConfigured = false;

export function configureAuth() {
    if (authConfigured) {
        return;
    }

    const runtimeConfig = getRuntimeConfig();

    Amplify.configure({
        Auth: {
            Cognito: {
                userPoolId: runtimeConfig.userPoolId,
                userPoolClientId: runtimeConfig.userPoolClientId,
                loginWith: {
                    email: true,
                    ...(runtimeConfig.cognitoDomain
                        ? {
                            oauth: {
                                domain: runtimeConfig.cognitoDomain,
                                scopes: ["openid", "email", "profile"],
                                redirectSignIn: runtimeConfig.authRedirectSignIn,
                                redirectSignOut: runtimeConfig.authRedirectSignOut,
                                responseType: "code" as const,
                                providers: ["Google" as const],
                            },
                        }
                        : {}),
                },
            },
        },
    });

    authConfigured = true;
}

export function isGoogleAuthEnabled() {
    return Boolean(getRuntimeConfig().cognitoDomain);
}
