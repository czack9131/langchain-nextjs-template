import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createRetrieverTool } from "langchain/tools/retriever";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { PrismaChatMessageHistory } from "../PrismaChatMessageHistory";

// TODO: Start back here
// https://js.langchain.com/docs/modules/agents/quick_start

const loader = new CheerioWebBaseLoader(
  "https://docs.smith.langchain.com/user_guide"
);
const rawDocs = await loader.load();

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200
});
const docs = await splitter.splitDocuments(rawDocs);

const vectorstore = await MemoryVectorStore.fromDocuments(
  docs,
  new OpenAIEmbeddings()
);
const retriever = vectorstore.asRetriever();

const retrieverTool = createRetrieverTool(retriever, {
  name: "langsmith_search",
  description:
    "Search for information about LangSmith. For any questions about LangSmith, you must use this tool!"
});

const llm = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.2
});

const tools = [searchTool, retrieverTool];

const agent = await createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt
});

const agentExecutor = new AgentExecutor({
  agent,
  tools
});

const messageHistory = new PrismaChatMessageHistory({
  sessionId: "default-session"
});

const agentWithChatHistory = new RunnableWithMessageHistory({
  runnable: agentExecutor,
  getMessageHistory: (_sessionId) => messageHistory,
  inputMessagesKey: "input",
  historyMessagesKey: "chatHistory"
});
