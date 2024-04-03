import { OpenAIEmbeddings } from "@langchain/openai";
import { Document, Prisma } from "@prisma/client";
import { PrismaVectorStore } from "langchain/vectorstores/prisma";
import prisma from "./prisma";

export const prismaVectorStore = PrismaVectorStore.withModel<Document>(
  prisma
).create(new OpenAIEmbeddings(), {
  prisma: Prisma,
  tableName: "Document",
  vectorColumnName: "vector",
  columns: {
    id: PrismaVectorStore.IdColumn,
    content: PrismaVectorStore.ContentColumn
  }
});

export const retriever = prismaVectorStore.asRetriever({ k: 4 });
