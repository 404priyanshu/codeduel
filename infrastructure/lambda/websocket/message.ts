import {
    DynamoDBClient,
    QueryCommand,
    DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

const db = new DynamoDBClient({});

export const handler = async (event: any) => {
    const connectionId = event.requestContext.connectionId;
    const domain = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    let body: any;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: "Invalid JSON" };
    }

    const sessionId = body.sessionId;
    const code = body.code;

    if (!sessionId) {
        return { statusCode: 400, body: "Missing sessionId" };
    }

    const apigw = new ApiGatewayManagementApiClient({
        endpoint: `https://${domain}/${stage}`,
    });

    const result = await db.send(new QueryCommand({
        TableName: process.env.TABLE_NAME!,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
            ":pk": { S: `SESSION#${sessionId}` },
        },
    }));

    const connections = result.Items ?? [];
    console.log(`Session ${sessionId}: found ${connections.length} connections`);

    const others = connections.filter((c) => c.connectionId.S !== connectionId);

    // Send to each connection, delete stale ones immediately
    await Promise.all(
        others.map(async (c) => {
            const connId = c.connectionId.S!;
            try {
                await apigw.send(new PostToConnectionCommand({
                    ConnectionId: connId,
                    Data: Buffer.from(JSON.stringify({ type: "code", code })),
                }));
            } catch (err: any) {
                // 410 Gone = stale connection, delete it from DynamoDB
                if (err.$metadata?.httpStatusCode === 410 || err.name === "GoneException") {
                    console.log(`Removing stale connection: ${connId}`);
                    await db.send(new DeleteItemCommand({
                        TableName: process.env.TABLE_NAME!,
                        Key: {
                            pk: { S: `SESSION#${sessionId}` },
                            sk: { S: `CONN#${connId}` },
                        },
                    }));
                }
            }
        })
    );

    return { statusCode: 200, body: "OK" };
};