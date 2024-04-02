import { chat } from "@/utils/chatbot3";
import { StreamingTextResponse } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

//https://github.com/smaameri/multi-doc-chatbot/blob/master/single-long-doc.py
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = body.question;

    const stream = await chat(question);

    return new StreamingTextResponse(stream);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
