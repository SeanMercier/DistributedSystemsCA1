import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as custom from "aws-cdk-lib/custom-resources";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { books, bookCasts } from "../seed/books";
import { generateBatch } from "../shared/util";

export class BooksAppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create a DynamoDB table for storing books
        const booksTable = new dynamodb.Table(this, "BooksTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Books",
        });

        const bookCastsTable = new dynamodb.Table(this, "BookCastTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "bookId", type: dynamodb.AttributeType.NUMBER },
            sortKey: { name: "authorName", type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "BookCast",
        });
        
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

        // API Gateway setup
        const api = new apigateway.RestApi(this, "BooksApi", {
            restApiName: "Books Service",
            description: "API for managing books in DynamoDB.",
        });

        // API Gateway resources and methods
        const booksResource = api.root.addResource("books");
        booksResource.addMethod("GET", new apigateway.LambdaIntegration(getAllBooksFn));

        const bookResource = booksResource.addResource("{id}");
        bookResource.addMethod("GET", new apigateway.LambdaIntegration(getBookByIdFn));

        const getBookCastMembersFn = new lambdanode.NodejsFunction(this, "GetBookCastMemberFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambda/getBookCastMembers.ts`,
            environment: {
                CAST_TABLE_NAME: bookCastsTable.tableName,
                REGION: "eu-west-1",
            },
        });
        
        const getBookCastMembersURL = getBookCastMembersFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ["*"],
            },
        });
        
        bookCastsTable.grantReadData(getBookCastMembersFn);
        
        new cdk.CfnOutput(this, "Get Book Cast URL", {
            value: getBookCastMembersURL.url,
        });
        

        // Seed data into DynamoDB table
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
