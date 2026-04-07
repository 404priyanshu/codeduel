import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Construct } from "constructs";
import * as path from "path";

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

    // ── DynamoDB ─────────────────────────────────────────
    const table = new dynamodb.Table(this, "CodeDuelTable", {
      tableName: "codeduel-sessions",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: "ttl",
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Lambda shared env ─────────────────────────────────
    const environment = { TABLE_NAME: table.tableName };

    // ── Lambda handlers ───────────────────────────────────
    const connectFn = new nodejs.NodejsFunction(this, "ConnectFn", {
      entry: path.join(__dirname, "../lambda/websocket/connect.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      environment,
      bundling: { forceDockerBundling: false },
    });

    const disconnectFn = new nodejs.NodejsFunction(this, "DisconnectFn", {
      entry: path.join(__dirname, "../lambda/websocket/disconnect.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      environment,
      bundling: { forceDockerBundling: false },
    });

    const messageFn = new nodejs.NodejsFunction(this, "MessageFn", {
      entry: path.join(__dirname, "../lambda/websocket/message.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      environment,
      bundling: { forceDockerBundling: false },
      timeout: cdk.Duration.seconds(29),
    });

    // Grant DynamoDB access
    table.grantReadWriteData(connectFn);
    table.grantReadWriteData(disconnectFn);
    table.grantReadWriteData(messageFn);

    // ── WebSocket API ─────────────────────────────────────
    const webSocketApi = new apigwv2.WebSocketApi(this, "CodeDuelWsApi", {
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "ConnectInt", connectFn
        ),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "DisconnectInt", disconnectFn
        ),
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration(
          "MessageInt", messageFn
        ),
      },
    });

    const wsStage = new apigwv2.WebSocketStage(this, "WsStage", {
      webSocketApi,
      stageName: "prod",
      autoDeploy: true,
    });

    // Grant message Lambda permission to post to connections
    webSocketApi.grantManageConnections(messageFn);

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

    new cdk.CfnOutput(this, "WebSocketUrl", {
      value: wsStage.url,
    });
  }
}
