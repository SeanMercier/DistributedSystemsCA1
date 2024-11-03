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
import * as iam from "aws-cdk-lib/aws-iam";

export class BooksAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Import User Pool ID from Auth Stack
        const userPoolId = cdk.Fn.importValue('UserPoolId');

        // Use the imported user pool
        const userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', userPoolId);

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

        // Lambda functions
        const getAllBooksFn = this.createLambdaFunction("GetAllBooksFn", `${__dirname}/../lambda/getAllBooks.ts`, booksTable);
        const addBookFn = this.createLambdaFunction("AddBookFn", `${__dirname}/../lambda/addBook.ts`, booksTable);
        const deleteBookFn = this.createLambdaFunction("DeleteBookFn", `${__dirname}/../lambda/deleteBook.ts`, booksTable);
        const deleteAllBooksFn = this.createLambdaFunction("DeleteAllBooksFn", `${__dirname}/../lambda/deleteAllBooks.ts`, booksTable);
        const getBookByIdFn = this.createLambdaFunction("GetBookByIdFn", `${__dirname}/../lambda/getBookById.ts`, booksTable);
        const updateBookFn = this.createLambdaFunction("UpdateBookFn", `${__dirname}/../lambda/updateBook.ts`, booksTable);
        
        // New translation Lambda function
        const translateTextFn = this.createLambdaFunction("TranslateTextFn", `${__dirname}/../lambda/translateText.ts`, booksTable);

        // Attach IAM Policy for TranslateText
        translateTextFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ["translate:TranslateText"],
            resources: ["*"],
        }));

        // API Gateway setup
        const api = new apigateway.RestApi(this, "BooksApi", {
            restApiName: "Books Service",
            description: "API for managing books in DynamoDB.",
            defaultCorsPreflightOptions: {
                allowHeaders: ["Content-Type", "X-Amz-Date"],
                allowMethods: ["OPTIONS", "GET"],
                allowOrigins: ["*"],
            },
        });

        // Create Cognito User Pools Authorizer
        const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
            cognitoUserPools: [userPool],
        });

        // API Gateway resources and methods
        const booksResource = api.root.addResource("books");
        booksResource.addMethod("GET", new apigateway.LambdaIntegration(getAllBooksFn)); // Public access
        booksResource.addMethod("POST", new apigateway.LambdaIntegration(addBookFn), {
            authorizer: cognitoAuthorizer, // Protected by Cognito
        });

        const bookResource = booksResource.addResource("{id}");
        bookResource.addMethod("GET", new apigateway.LambdaIntegration(getBookByIdFn)); // Public access
        bookResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteBookFn), {
            authorizer: cognitoAuthorizer, // Protected by Cognito
        });
        bookResource.addMethod("PUT", new apigateway.LambdaIntegration(updateBookFn), {
            authorizer: cognitoAuthorizer, // Protected by Cognito
        });

        // Add DELETE method for all books
        booksResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteAllBooksFn), {
            authorizer: cognitoAuthorizer, // Protected by Cognito
        }); // Delete all books

        // New Translate endpoint
        const translateResource = api.root.addResource("translate");
        translateResource.addMethod("GET", new apigateway.LambdaIntegration(translateTextFn)); // Public access

        // Expose getBookCastMembersFn with a URL
        const getBookCastMembersFn = this.createLambdaFunction("GetBookCastMemberFn", `${__dirname}/../lambda/getBookCastMembers.ts`, bookCastsTable);
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

    private createLambdaFunction(name: string, entry: string, table: dynamodb.Table): lambdanode.NodejsFunction {
        const lambdaFn = new lambdanode.NodejsFunction(this, name, {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: entry,
            environment: {
                TABLE_NAME: table.tableName,
                REGION: "eu-west-1",
            },
        });
        table.grantReadWriteData(lambdaFn);
        return lambdaFn;
    }
}
