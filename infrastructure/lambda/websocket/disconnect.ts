import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const db = new DynamoDBClient({});

export const handler = async (event: any) => {
    const connectionId = event.requestContext.connectionId;
    const sessionId = event.queryStringParameters?.sessionId;

    if (!sessionId) return { statusCode: 400, body: "Missing sessionId" };

    await db.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME!,
        Key: {
            pk: { S: `SESSION#${sessionId}` },
            sk: { S: `CONN#${connectionId}` },
        },
    }));

    return { statusCode: 200, body: "Disconnected" };
};