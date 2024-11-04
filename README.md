# Serverless REST Assignment - Distributed Systems

**Name:** Sean Mercier

**Demo:** [YouTube Video Demonstration](https://youtu.be/vxM7pMofBow)

## Context

The context chosen for the web API is a book management system. This API allows users to manage a collection of books, including their details and associated cast members. The main database table, "Books," stores the following attributes:

- **id:** Unique identifier for each book (number).
- **title:** Title of the book (string).
- **author:** Author of the book (string).
- **description:** Brief description of the book (string).
- **publicationDate:** Date when the book was published (string).
- **genre:** Genre of the book (string).

## App API Endpoints

- **GET /books** - Retrieve all books.
- **POST /books** - Add a new book.
- **GET /books/{id}** - Get details of a specific book by its ID.
- **PUT /books/{id}** - Update an existing book by its ID.
- **DELETE /books/{id}** - Delete a specific book by its ID.
- **DELETE /books** - Delete all books.
- **GET /translate** - Translate the description of a book based on its ID and target language.
- **GET /bookcasts?bookId={id}** - Get all cast members associated with a specific book by its ID.
- **GET /bookcasts?bookId={id}&authorName={name}** - Get cast members for a specific book filtered by author name.
- **GET /bookcasts?bookId={id}&roleName={name}** - Get cast members for a specific book filtered by role name.

## Update Constraint

### Update Constraint

There is no update constraint implemented in the application as I wasn't able to code it successfully despite many attempts. Any authenticated user can update any book regardless of who created it.

## Translation Persistence

To avoid repeat requests to Amazon Translate, the system persists translations in a separate DynamoDB table. Each time a translation is requested, the API first checks if the requested translation already exists in the database. If it does, the stored translation is returned, bypassing the need to call Amazon Translate, thus reducing costs and improving response times.

## Extra

This assignment utilizes a multi-stack solution to organize different components of the application effectively.
