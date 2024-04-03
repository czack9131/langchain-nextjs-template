import { prismaVectorStore } from "@/lib/PrismaVectorStore";
import prisma from "@/lib/prisma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HNSWLib } from "langchain/vectorstores/hnswlib";

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0
});

export async function createHNSWLibVectorStoreFromPDF(
  pdfPath: string,
  storagePath?: string
) {
  try {
    const loader = new PDFLoader(pdfPath);
    const documents = await loader.load(); // Load documents from PDF
    const splitDocuments = await textSplitter.splitDocuments(documents); // Split documents as needed

    const vs = await HNSWLib.fromDocuments(splitDocuments, new OpenAIEmbeddings());

    if (storagePath) {
      await vs.save(storagePath);
    }

    return vs;
  } catch (error) {
    console.error(error);
  }
}

export async function addPDFToVectorStore(pdfPath: string) {
  try {
    const loader = new PDFLoader(pdfPath);
    const documents = await loader.load(); // Load documents from PDF
    const splitDocuments = await textSplitter.splitDocuments(documents); // Split documents as needed

    await prismaVectorStore.addModels(
      await prisma.$transaction(
        splitDocuments.map((content) =>
          prisma.document.create({ data: { content: content.pageContent } })
        )
      )
    );
  } catch (error) {
    console.error(error);
  }
}
