import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from "langchain/chains";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { BufferMemory } from "langchain/memory";
import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate
} from "langchain/prompts";
import { RunnableSequence, RunnableWithMessageHistory } from "langchain/runnables";
import { StringOutputParser } from "langchain/schema/output_parser";
import { formatDocumentsAsString } from "langchain/util/document";
import { PrismaChatMessageHistory } from "./PrismaChatMessageHistory";
import { retriever } from "./PrismaVectorStore";

export type PromptInput = { question: string; chatHistory?: string };
const prompt = ChatPromptTemplate.fromMessages([
  new SystemMessagePromptTemplate(
    "Use the following pieces of context to answer the question at the end. \
    If you don't know the answer, just say that you don't know, don't try to \
    make up an answer."
  ),
  new AIMessagePromptTemplate("context"),
  new MessagesPlaceholder("chatHistory"),
  new HumanMessagePromptTemplate("question"),
  new AIMessagePromptTemplate("answer")
]);

export class ChatBot {
  private model = new ChatOpenAI({
    temperature: 0.2,
    modelName: "gpt-3.5-turbo"
  });

  private chain = RunnableSequence.from([
    {
      // Pipe the question through unchanged
      question: (input: PromptInput) => input.question,
      // Fetch the chat history, and return the history or null if not present
      chatHistory: (input: PromptInput) => input.chatHistory ?? "",
      // Fetch relevant context based on the question
      context: async (input: PromptInput) => {
        const relevantDocs = await retriever.getRelevantDocuments(input.question);
        const serialized = formatDocumentsAsString(relevantDocs);
        return serialized;
      }
    },
    prompt,
    this.model,
    new StringOutputParser()
  ]);

  private chainWithHistory = new RunnableWithMessageHistory({
    runnable: this.chain,
    inputMessagesKey: "question",
    historyMessagesKey: "chatHistory",
    getMessageHistory: (sessionId) => new PrismaChatMessageHistory({ sessionId })
  });

  constructor(public readonly sessionId: string = "default-session") {
    const combineDocsChain = await createStuffDocumentsChain({
      prompt,
      llm: this.model,
      outputParser: new StringOutputParser(),
      documentPrompt
    });
    const retrievalChain = await createRetrievalChain({
      retriever,
      combineDocsChain
    });

    const c = new ConversationChain({
      prompt: prompt,
      llm: this.model,
      outputKey: "answer",
      outputParser: new StringOutputParser(),
      memory: new BufferMemory({
        memoryKey: "chatHistory",
        returnMessages: true,
        chatHistory: new PrismaChatMessageHistory({ sessionId })
      })
    });
  }

  stream = this.chainWithHistory.stream;
  invoke = this.chainWithHistory.invoke;
}
