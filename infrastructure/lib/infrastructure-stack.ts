import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class InfrastructureStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parseCsv = (value: string | undefined, fallback: string[]) =>
      value
        ? value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
        : fallback;

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const cognitoDomainPrefix = process.env.COGNITO_DOMAIN_PREFIX;
    const callbackUrls = parseCsv(process.env.AUTH_CALLBACK_URLS, [
      "http://localhost:5173/login",
    ]);
    const logoutUrls = parseCsv(process.env.AUTH_LOGOUT_URLS, [
      "http://localhost:5173/",
    ]);
    const googleAuthRequested = Boolean(
      googleClientId || googleClientSecret || cognitoDomainPrefix
    );

    if (
      googleAuthRequested &&
      (!googleClientId || !googleClientSecret || !cognitoDomainPrefix)
    ) {
      throw new Error(
        "Google auth requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and COGNITO_DOMAIN_PREFIX."
      );
    }

    // ── Cognito ──────────────────────────────────────────
    const userPool = new cognito.UserPool(this, "CodeDuelUserPool", {
      userPoolName: "codeduel-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, "CodeDuelWebClient", {
      userPool,
      userPoolClientName: "codeduel-web",
      authFlows: { userPassword: true, userSrp: true },
      generateSecret: false,
      ...(googleAuthRequested
        ? {
            supportedIdentityProviders: [
              cognito.UserPoolClientIdentityProvider.COGNITO,
              cognito.UserPoolClientIdentityProvider.GOOGLE,
            ],
            oAuth: {
              flows: {
                authorizationCodeGrant: true,
              },
              scopes: [
                cognito.OAuthScope.OPENID,
                cognito.OAuthScope.EMAIL,
                cognito.OAuthScope.PROFILE,
              ],
              callbackUrls,
              logoutUrls,
              defaultRedirectUri: callbackUrls[0],
            },
          }
        : {}),
    });

    let userPoolDomain: cognito.UserPoolDomain | undefined;

    if (googleAuthRequested && googleClientId && googleClientSecret && cognitoDomainPrefix) {
      const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
        this,
        "CodeDuelGoogleIdentityProvider",
        {
          userPool,
          clientId: googleClientId,
          clientSecretValue: cdk.SecretValue.unsafePlainText(googleClientSecret),
          scopes: ["openid", "email", "profile"],
          attributeMapping: {
            email: cognito.ProviderAttribute.GOOGLE_EMAIL,
            emailVerified: cognito.ProviderAttribute.GOOGLE_EMAIL_VERIFIED,
            givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
            familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
            fullname: cognito.ProviderAttribute.GOOGLE_NAME,
            profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
          },
        }
      );

      userPoolDomain = new cognito.UserPoolDomain(this, "CodeDuelAuthDomain", {
        userPool,
        cognitoDomain: {
          domainPrefix: cognitoDomainPrefix,
        },
      });

      userPoolClient.node.addDependency(googleProvider);
    }

    // ── Outputs ───────────────────────────────────────────
    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });

    if (userPoolDomain) {
      new cdk.CfnOutput(this, "CognitoDomain", {
        value: userPoolDomain.baseUrl(),
      });
    }
  }
}
