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
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { HumanMessage, SystemMessage } from "langchain/schema";
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

const systemTemplate =
  "You are a helpful assistant that mimics a College Teaching Assistant. Answer all questions to the best of your ability.";
const humanTemplate = "{input}";

export const prompt = ChatPromptTemplate.fromMessages([
  new SystemMessage(systemTemplate),
  new MessagesPlaceholder("history"),
  new HumanMessage(humanTemplate)
]);
export const model = new ChatOpenAI({
  temperature: 0.2,
  cache: true,
  modelName: "gpt-3.5-turbo"
});

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0
});
export const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
  ["system", "Answer the user's questions based on the below context:\n\n{context}"],
  new MessagesPlaceholder("history")
]);
export const chatMessageHistory = new ChatMessageHistory();

const memory = new BufferMemory({
  returnMessages: true,
  inputKey: "input",
  outputKey: "output",
  memoryKey: "history"
});

const chain = RunnableSequence.from([
  {
    input: (initialInput) => initialInput.input,
    memory: () => memory.loadMemoryVariables({})
  },
  {
    input: (previousOutput) => previousOutput.input,
    history: (previousOutput) => previousOutput.memory.history
  },
  prompt,
  model
]);

function chat() {}

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

const loader = new PDFLoader("src/data/syl.pdf");
const documents = await loader.load();
const splits = await textSplitter.splitDocuments(documents);
const vectorStore = await Chroma.fromDocuments(splits, new OpenAIEmbeddings(), {
  collectionName: "test-collection"
});
const retriever = vectorStore.asRetriever({ k: 4 });

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
