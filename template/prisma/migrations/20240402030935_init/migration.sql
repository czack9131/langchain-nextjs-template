-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "namespace" TEXT DEFAULT 'default',
    "vector" vector,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

CREATE EXTENSION IF NOT EXISTS vector;