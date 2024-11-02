# Books API

## Overview
This project demonstrates the implementation of a RESTful API for managing a collection of books using AWS services, including DynamoDB, AWS Lambda, and AWS Cognito for authentication.

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [How to Run the Project](#how-to-run-the-project)
- [License](#license)

## Features
- **Add Books**: Allows users to add new books to the collection.
- **Get Books**: Retrieve all books or a specific book by ID.
- **Update Books**: Update the details of a book by ID.
- **Delete Books**: Delete a specific book or delete all books.
- **Authentication**: Secure POST and PUT requests using AWS Cognito.

## Architecture
The application utilizes the following AWS services:
- **Amazon Cognito**: For user authentication.
- **Amazon DynamoDB**: For storing book information and book casts.
- **AWS Lambda**: For serverless functions that handle API requests.
- **Amazon API Gateway**: To expose the Lambda functions as a RESTful API.

## API Endpoints
| Method | Endpoint                                       | Description                       |
|--------|-----------------------------------------------|-----------------------------------|
| GET    | `/books`                                     | Retrieve all books               |
| GET    | `/books/{id}`                                | Retrieve a book by ID            |
| POST   | `/books`                                     | Add a new book                   |
| PUT    | `/books/{id}`                                | Update a book by ID              |
| DELETE | `/books/{id}`                                | Delete a specific book           |
| DELETE | `/books`                                     | Delete all books                 |

### Sample Request Body for Adding/Updating a Book
```json
{
    "id": 2,
    "title": "1984",
    "author": "George Orwell",
    "genre": "Dystopian",
    "description": "A cautionary tale about the dangers of totalitarianism.",
    "publicationDate": "1949-06-08"
}
```

## How to run the project
1: install the necessary dependencies: npm install
2: Deploy all stacks in the application: cdk deploy --all
3: Enter 'y' when prompted until stacks are deployed

