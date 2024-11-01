import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as custom from "aws-cdk-lib/custom-resources";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { books, bookCasts } from "../seed/books";
import { generateBatch } from "../shared/util";
import * as cognito from "aws-cdk-lib/aws-cognito";

export class BooksAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create a Cognito User Pool for authentication
        const userPool = new cognito.UserPool(this, "UserPool", {
            signInAliases: { email: true }, // allow sign in with email
            selfSignUpEnabled: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Only for dev/test
        });

        // Create a DynamoDB table for storing books
        const booksTable = new dynamodb.Table(this, "BooksTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Books",
        });

        // Create a DynamoDB table for book casts
        const bookCastsTable = new dynamodb.Table(this, "BookCastTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
            sortKey: { name: "authorName", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "BookCast",
        });

        // Local secondary index for bookCastsTable
        bookCastsTable.addLocalSecondaryIndex({
            indexName: "roleIx",
            sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
        });

        // Lambda to get a single book by id
        const getBookByIdFn = new lambdanode.NodejsFunction(this, "GetBookByIdFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/getBookById.ts`,
            environment: {
                TABLE_NAME: booksTable.tableName,
                REGION: "eu-west-1",
            },
        });
        booksTable.grantReadData(getBookByIdFn);

        // Lambda to get all books
        const getAllBooksFn = new lambdanode.NodejsFunction(this, "GetAllBooksFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/getAllBooks.ts`,
            environment: {
                TABLE_NAME: booksTable.tableName,
                REGION: "eu-west-1",
            },
        });
        booksTable.grantReadData(getAllBooksFn);

        // Lambda to add a new book
        const addBookFn = new lambdanode.NodejsFunction(this, "AddBookFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/addBook.ts`,
            environment: {
                TABLE_NAME: booksTable.tableName,
                REGION: "eu-west-1",
            },
        });
        booksTable.grantReadWriteData(addBookFn);

        // Lambda to delete book by id
        const deleteBookFn = new lambdanode.NodejsFunction(this, "DeleteBookFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/deleteBook.ts`,
            environment: {
                TABLE_NAME: booksTable.tableName,
                REGION: "eu-west-1",
            },
        });
        booksTable.grantReadWriteData(deleteBookFn); // Grant permissions for the delete function

        // Lambda to delete all books
        const deleteAllBooksFn = new lambdanode.NodejsFunction(this, "DeleteAllBooksFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/deleteAllBooks.ts`,
            environment: {
                TABLE_NAME: booksTable.tableName,
                REGION: "eu-west-1",
            },
        });
        booksTable.grantReadWriteData(deleteAllBooksFn); // Grant permission to read and delete

        // Lambda to get book cast members
        const getBookCastMembersFn = new lambdanode.NodejsFunction(this, "GetBookCastMemberFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/getBookCastMembers.ts`,
            environment: {
                CAST_TABLE_NAME: bookCastsTable.tableName,
                BOOKS_TABLE_NAME: booksTable.tableName,
                REGION: "eu-west-1",
            },
        });
        bookCastsTable.grantReadData(getBookCastMembersFn);

        // API Gateway setup
        const api = new apigateway.RestApi(this, "BooksApi", {
            restApiName: "Books Service",
            description: "API for managing books in DynamoDB.",
            defaultCorsPreflightOptions: {
                allowHeaders: ["Content-Type", "X-Amz-Date"],
                allowMethods: ["OPTIONS", "GET", "POST"],
                allowOrigins: ["*"],
            },
        });

        // API Gateway resources and methods
        const booksResource = api.root.addResource("books");
        booksResource.addMethod("GET", new apigateway.LambdaIntegration(getAllBooksFn));
        booksResource.addMethod("POST", new apigateway.LambdaIntegration(addBookFn), {
            authorizer: new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
                cognitoUserPools: [userPool],
            }),
        });

        const bookResource = booksResource.addResource("{id}");
        bookResource.addMethod("GET", new apigateway.LambdaIntegration(getBookByIdFn));
        bookResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteBookFn));

        // Add DELETE method for all books
        booksResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteAllBooksFn)); // Delete all books

        // Expose getBookCastMembersFn with a URL
        const getBookCastMembersURL = getBookCastMembersFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ["*"],
            },
        });

        // Output for book cast member URL
        new cdk.CfnOutput(this, "GetBookCastURL", {
            value: getBookCastMembersURL.url,
        });

        // Seed data into DynamoDB tables
        new custom.AwsCustomResource(this, "booksddbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [booksTable.tableName]: generateBatch(books),
                        [bookCastsTable.tableName]: generateBatch(bookCasts),
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("booksddbInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [booksTable.tableArn, bookCastsTable.tableArn],
            }),
        });
    }
}