import { APIGatewayProxyHandler } from 'aws-lambda';
import 'source-map-support/register';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

// Create DynamoDB Document Client
const ddbDocClient = createDDbDocClient();
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        console.log("Books Table Name:", process.env.TABLE_NAME); // Log the table name
        
        console.log("Event:", JSON.stringify(event));
        const bookId = event?.queryStringParameters?.bookId; // Get book ID from query parameters
        const targetLanguage = event.queryStringParameters?.targetLanguage; // Get target language from query parameters

        // Validate bookId
        if (!bookId) {
            return {
                statusCode: 404,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Invalid book ID" }),
            };
        }

        // Validate targetLanguage
        const validLanguages = ['en', 'fr', 'es', 'de']; // Add any other supported languages here
        if (!targetLanguage || !validLanguages.includes(targetLanguage)) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "Invalid language parameter" }),
            };
        }

        const bookResponse = await ddbDocClient.send(
            new GetCommand({
                TableName: process.env.TABLE_NAME,
                Key: { id: parseInt(bookId) },
            })
        );

        if (!bookResponse.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Book not found' }),
            };
        }

        const textToTranslate = bookResponse.Item.description; // Assuming you're translating the description

        if (!textToTranslate) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'No content available for translation' }),
            };
        }

        const translateParams = {
            Text: textToTranslate.substring(0, 5000), // Limit text length for translation
            SourceLanguageCode: 'en',
            TargetLanguageCode: targetLanguage,
        };

        const translateCommand = new TranslateTextCommand(translateParams);
        const translatedMessage = await translateClient.send(translateCommand);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ translatedText: translatedMessage.TranslatedText }),
        };

    } catch (error) {
        console.error("Error:", JSON.stringify(error));

        // Check if error is an instance of Error and has a message property
        const errorMessage = (error instanceof Error) ? error.message : "Internal server error";

        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Internal server error", error: errorMessage }),
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    return DynamoDBDocumentClient.from(ddbClient);
}
