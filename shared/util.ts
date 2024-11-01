import { marshall } from "@aws-sdk/util-dynamodb";
import { Book, BookCast } from "./types";

type Entity = Book | BookCast;

export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};