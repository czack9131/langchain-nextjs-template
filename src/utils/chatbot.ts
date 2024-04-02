import { Chroma } from "@langchain/community/vectorstores/chroma";
import { type Document } from "@langchain/core/documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
  type RunnableAssign,
  type RunnableConfig
} from "@langchain/core/runnables";
import { type VectorStoreRetriever } from "@langchain/core/vectorstores";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { ChatMessageHistory } from "langchain/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

//const db = new PrismaClient();
// async function prismaVectorStore() {
//   const vectorStore = PrismaVectorStore.withModel<Document>(db).create(
//     new OpenAIEmbeddings(),
//     {
//       prisma: Prisma,
//       tableName: "Document",
//       vectorColumnName: "vector",
//       columns: {
//         id: PrismaVectorStore.IdColumn,
//         content: PrismaVectorStore.ContentColumn
//       }
//     }
//   );
// }

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant that mimics the helpfulness of a College TA. Answer all questions to the best of your ability."
  ],
  new MessagesPlaceholder("messages")
]);
const model = new ChatOpenAI({
  temperature: 0.2,
  modelName: "gpt-3.5-turbo"
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0
});
const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
  ["system", "Answer the user's questions based on the below context:\n\n{context}"],
  new MessagesPlaceholder("messages")
]);
const chatMessageHistory = new ChatMessageHistory();

async function initDocumentsChain() {
  return createStuffDocumentsChain({
    llm: model,
    prompt: questionAnsweringPrompt
  });
}

/* Load all PDFs within the specified directory */
// const directoryLoader = new DirectoryLoader(
//   "src/document_loaders/example_data/",
//   {
//     ".pdf": (path: string) => new PDFLoader(path),
//   }
// );

async function initPDFLoader() {
  // https://js.langchain.com/docs/integrations/document_loaders/file_loaders/pdf
  const loader = new PDFLoader("src/data/syl.pdf");
  const documents = await loader.load();

  return textSplitter.splitDocuments(documents);
}

async function initVectorStore(splits: Document<Record<string, any>>[]) {
  const vectorStore = await Chroma.fromDocuments(splits, new OpenAIEmbeddings(), {
    collectionName: "test-collection"
  });

  return { vectorStore, retriever: vectorStore.asRetriever({ k: 4 }) };
}

function getRetrievalChain(
  retriever: VectorStoreRetriever<Chroma>,
  documentChain: RunnableSequence<Record<string, unknown>, string>
) {
  return (
    RunnablePassthrough.assign({
      parse_retriever_input:
        ((params: any) => params["messages"][-1].content) || retriever
    }) || documentChain
  );
}

async function chat(
  retrievalChain: RunnableAssign<any, any, RunnableConfig>,
  message: string
) {
  chatMessageHistory.addUserMessage(message);
  const response = await retrievalChain.invoke({
    messages: chatMessageHistory.getMessages
  });
  chatMessageHistory.addAIMessage(response);
  return response;
}

function initChat(
  retriever: VectorStoreRetriever<Chroma>,
  documentChain: RunnableSequence<Record<string, unknown>, string>
) {
  return (message: string) =>
    chat(getRetrievalChain(retriever, documentChain), message);
}

// Primarily for testing purposes
// if __name__ == "__main__":
//     loopFlag = True
//     while loopFlag:
//         loopUserMessage = input("User message: ")
//         demo_ephemeral_chat_history.add_user_message(loopUserMessage)
//         loopResponse = retrieval_chain.invoke({"messages": demo_ephemeral_chat_history.messages})
//         demo_ephemeral_chat_history.add_ai_message(loopResponse)
//         print(f"VirtualTA: {loopResponse}")

//         if loopUserMessage == "quit":
//             loopFlag = False
