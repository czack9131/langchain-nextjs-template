import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate
} from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StreamingTextResponse, Message as VercelChatMessage } from "ai";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const model = new ChatOpenAI({
  temperature: 0.2,
  modelName: "gpt-3.5-turbo"
});

const CHAT_PROMPT_TEMPLATE = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant that mimics the helpfulness of a College TA. Answer all questions to the best of your ability."
  ],
  new MessagesPlaceholder("history") // new MessagesPlaceholder("messages")
]);
//https://github.com/smaameri/multi-doc-chatbot/blob/master/single-long-doc.py
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    const currentMessageContent = messages[messages.length - 1].content;
    const prompt = PromptTemplate.fromTemplate(CHAT_PROMPT_TEMPLATE);

    const model = new ChatOpenAI({
      temperature: 0.2,
      modelName: "gpt-3.5-turbo"
    });

    const outputParser = new HttpResponseOutputParser();
    const chain = prompt.pipe(model).pipe(outputParser);

    const stream = await chain.stream({
      chat_history: formattedPreviousMessages.join("\n"),
      input: currentMessageContent
    });

    return new StreamingTextResponse(stream);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
