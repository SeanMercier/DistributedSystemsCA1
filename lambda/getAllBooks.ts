import { APIGatewayProxyHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        // Get the authorName from the query parameters
        const authorName = event.queryStringParameters?.authorName;

        const command = new ScanCommand({
            TableName: process.env.TABLE_NAME,
        });

        const response = await ddbDocClient.send(command);

        let items = response.Items || [];

        // If authorName is provided, filter the results
        if (authorName) {
            items = items.filter(book => book.author === authorName);
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: items }),
        };
    } catch (error) {
        console.error("Error fetching books:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};
