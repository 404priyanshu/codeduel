import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({});

export const handler = async (event: any) => {
    const connectionId = event.requestContext.connectionId;
    const sessionId = event.queryStringParameters?.sessionId;

    if (!sessionId) {
        return { statusCode: 400, body: "Missing sessionId" };
    }

    await db.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME!,
        Item: {
            pk: { S: `SESSION#${sessionId}` },
            sk: { S: `CONN#${connectionId}` },
            connectionId: { S: connectionId },
            sessionId: { S: sessionId },
            ttl: { N: String(Math.floor(Date.now() / 1000) + 86400) },
        },
    }));

    return { statusCode: 200, body: "Connected" };
};