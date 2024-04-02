import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { ChatMessageHistory } from "langchain/memory";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { formatDocumentsAsString } from "langchain/util/document";

export const chatMessageHistory = new ChatMessageHistory();

// https://js.langchain.com/docs/modules/chains/popular/chat_vector_db

/**
 * Create a prompt template for generating an answer based on context and
 * a question.
 *
 * Chat history will be an empty string if it's the first question.
 *
 * inputVariables: ["chatHistory", "context", "question"]
 */
const questionPrompt = PromptTemplate.fromTemplate(
  `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
  ----------------
  CONTEXT: {context}
  ----------------
  CHAT HISTORY: {chatHistory}
  ----------------
  QUESTION: {question}
  ----------------
  Helpful Answer:`
);

const model = new ChatOpenAI({
  temperature: 0.2,
  modelName: "gpt-3.5-turbo"
});
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0
});

type ChainParamInput = { question: string; chatHistory?: string };
//https://github.com/supabase-community/nextjs-openai-doc-search/blob/main/pages/api/vector-search.ts
async function createVectorStoreFromPDF(pdfPath: string) {
  const loader = new PDFLoader(pdfPath);
  const documents = await loader.load(); // Load documents from PDF
  const splitDocuments = await textSplitter.splitDocuments(documents); // Split documents as needed

  return await HNSWLib.fromDocuments(splitDocuments, new OpenAIEmbeddings());
}

const vectorStore = createVectorStoreFromPDF("../data/syl.pdf");

const chain = RunnableSequence.from([
  {
    question: (input: ChainParamInput) => input.question,
    chatHistory: (input: ChainParamInput) => input.chatHistory ?? "",
    context: async (input: ChainParamInput) => {
      const relevantDocs = await (await vectorStore)
        .asRetriever({ k: 4 })
        .getRelevantDocuments(input.question);
      return formatDocumentsAsString(relevantDocs);
    }
  },
  questionPrompt,
  model,
  new HttpResponseOutputParser()
]);

export async function chat(question: string) {
  // Get before question added to history
  const messages = (await chatMessageHistory.getMessages()) ?? [];

  chatMessageHistory.addUserMessage(question);
  const response = await chain.stream({
    question,
    chatHistory: messages.map((m) => m.content).join("\n")
  });

  return response;
}

export const registerChatResponse = chatMessageHistory.addAIMessage;
