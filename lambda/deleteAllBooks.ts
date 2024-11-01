import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    // Scan the table to get all books
    const scanCommand = new ScanCommand({
      TableName: process.env.TABLE_NAME,
    });

    const commandOutput = await ddbDocClient.send(scanCommand);
    
    // Check if there are no items
    if (!commandOutput.Items || commandOutput.Items.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: "No books found to delete." }),
      };
    }

    // Delete each book
    const deletePromises = commandOutput.Items.map(async (item) => {
      const deleteCommand = new DeleteCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: item.id }, // Assuming 'id' is the partition key
      });
      return ddbDocClient.send(deleteCommand);
    });

    await Promise.all(deletePromises); // Wait for all delete operations to complete

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: "All books deleted successfully." }),
    };
  } catch (error: any) {
    console.error("Error deleting books:", error);
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
