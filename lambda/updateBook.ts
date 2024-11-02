import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Initialize DynamoDB Document Client
const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // Get the book ID from the path parameters
        const bookId = event.pathParameters?.id;
        if (!bookId) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Book ID is required" }),
            };
        }

        // Parse the request body
        const body = event.body ? JSON.parse(event.body) : undefined;
        if (!body) {
            return {
                statusCode: 400,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ message: "Request body is required" }),
            };
        }

        // Update the book in DynamoDB
        const commandOutput = await ddbDocClient.send(
            new UpdateCommand({
                TableName: process.env.TABLE_NAME,
                Key: { id: parseInt(bookId) },
                UpdateExpression: "set #title = :title, #author = :author, #genre = :genre, #description = :description, #publicationDate = :publicationDate",
                ExpressionAttributeNames: {
                    "#title": "title",
                    "#author": "author",
                    "#genre": "genre",
                    "#description": "description",
                    "#publicationDate": "publicationDate",
                },
                ExpressionAttributeValues: {
                    ":title": body.title,
                    ":author": body.author,
                    ":genre": body.genre,
                    ":description": body.description,
                    ":publicationDate": body.publicationDate,
                },
                ReturnValues: "UPDATED_NEW",
            })
        );

        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Book updated successfully", data: commandOutput.Attributes }),
        };
    } catch (error: any) {
        console.error("Error updating book:", error);
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};

// Helper function to initialize the DynamoDB Document Client
function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
