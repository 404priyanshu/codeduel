import {
    DynamoDBClient,
    QueryCommand,
} from "@aws-sdk/client-dynamodb";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const db = new DynamoDBClient({});

export const handler = async (event: any) => {
    const connectionId = event.requestContext.connectionId;
    const sessionId = event.queryStringParameters?.sessionId;
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    const apigw = new ApiGatewayManagementApiClient({
        endpoint: `https://${domain}/${stage}`,
    });

    // Get all connections in this session
    const result = await db.send(new QueryCommand({
        TableName: process.env.TABLE_NAME!,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
            ":pk": { S: `SESSION#${sessionId}` },
        },
    }));

    const connections = result.Items ?? [];
    const body = event.body;

    // Broadcast to everyone except sender
    await Promise.allSettled(
        connections
            .filter((c) => c.connectionId.S !== connectionId)
            .map((c) =>
                apigw.send(new PostToConnectionCommand({
                    ConnectionId: c.connectionId.S!,
                    Data: Buffer.from(body),
                }))
            )
    );

    return { statusCode: 200, body: "OK" };
};