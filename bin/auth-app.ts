#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthAppStack } from '../lib/auth-app-stack';
import { BooksAppStack } from '../lib/books-app-stack';

const app = new cdk.App();

// Deploy AuthAPIStack
new AuthAppStack(app, 'AuthAPIStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

// Deploy BooksAppStack
new BooksAppStack(app, 'BooksAppStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
