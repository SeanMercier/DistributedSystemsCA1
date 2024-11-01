import { Book, BookCast } from '../shared/types';

export const books: Book[] = [
    {
        id: 1,
        title: "To Kill a Mockingbird",
        author: "Harper Lee",
        genre: "Fiction",
        description: "A novel about racial injustice in the Deep South.",
        publicationDate: "1960-07-11",
    },
    {
        id: 2,
        title: "1984",
        author: "George Orwell",
        genre: "Dystopian",
        description: "A cautionary tale about the dangers of totalitarianism.",
        publicationDate: "1949-06-08",
    },
    {
        id: 3,
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        genre: "Classic",
        description: "A story of the jazz age in the United States and the American dream.",
        publicationDate: "1925-04-10",
    },
    {
        id: 4,
        title: "Pride and Prejudice",
        author: "Jane Austen",
        genre: "Romance",
        description: "A romantic novel about manners, upbringing, and marriage in early 19th-century England.",
        publicationDate: "1813-01-28",
    },
    {
        id: 5,
        title: "The Catcher in the Rye",
        author: "J.D. Salinger",
        genre: "Fiction",
        description: "A story about the challenges of teenage rebellion and alienation.",
        publicationDate: "1951-07-16",
    },
];

export const bookCasts: BookCast[] = [
    {
        bookId: 1,
        authorName: "Harper Lee",
        roleName: "Scout Finch",
        roleDescription: "The young narrator of the story who learns about racial injustice.",
    },
    {
        bookId: 2,
        authorName: "George Orwell",
        roleName: "Winston Smith",
        roleDescription: "The protagonist who rebels against the totalitarian regime of Oceania.",
    },
    {
        bookId: 3,
        authorName: "F. Scott Fitzgerald",
        roleName: "Jay Gatsby",
        roleDescription: "A wealthy and mysterious man who throws lavish parties in pursuit of his lost love.",
    },
    {
        bookId: 4,
        authorName: "Jane Austen",
        roleName: "Elizabeth Bennet",
        roleDescription: "The protagonist, known for her wit and independent spirit.",
    },
    {
        bookId: 5,
        authorName: "J.D. Salinger",
        roleName: "Holden Caulfield",
        roleDescription: "A teenager who deals with the angst of adolescence and alienation.",
    },
];
