import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  appendResponseMessages,
  createDataStream,
  generateId,
  Message,
  streamText,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/db";
import { chats } from "@/db/schema/chats";
import { createResumableStreamContext } from "resumable-stream";
import { waitUntil } from "@vercel/functions";
import { appendStreamId, loadStreams } from "@/lib/chat-store";
import { eq } from "drizzle-orm";

async function storeChat(id: string, messages: Message[]) {
  const r = await db.insert(chats).values({ id, messages }).onConflictDoUpdate({
    target: chats.id,
    set: {
      messages,
    },
  });
}

async function getChat(id: string) {
  const chat = await db.select().from(chats).where(eq(chats.id, id));
  if (chat.length < 1) {
    return [];
  }
  return chat;
}

export const APIRoute = createAPIFileRoute("/api/chat")({
  POST: async ({ request, params }) => {
    const streamContext = createResumableStreamContext({
      waitUntil,
    });
    const { messages, id } = await request.json();
    const streamId = generateId();
    await appendStreamId({ chatId: id, streamId });

    const stream = createDataStream({
      execute: (stream) => {
        const result = streamText({
          model: openai("gpt-4o-mini"),
          messages,
          async onFinish({ response }) {
            await storeChat(
              id,
              appendResponseMessages({
                messages,
                responseMessages: response.messages,
              }),
            );
          },
        });
        result.mergeIntoDataStream(stream);
      },
    });
    return new Response(
      await streamContext.resumableStream(streamId, () => stream),
    );
  },
  GET: async ({ params, request }) => {
    console.log(request.url);
    const prom = () => new Promise(() => {});
    const streamContext = createResumableStreamContext({
      waitUntil,
    });
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return new Response("id is required", { status: 400 });
    }
    const streamIds = await loadStreams(chatId);
    if (!streamIds.length) {
      return new Response("No Streams found", { status: 404 });
    }
    const lastStreamId = streamIds.at(-1);
    if (!lastStreamId) {
      return new Response("No recent stream found", { status: 404 });
    }
    const emptyDataStream = createDataStream({
      execute: () => {},
    });
    const stream = await streamContext.resumableStream(
      lastStreamId,
      () => emptyDataStream,
    );
    if (stream) {
      return new Response(stream, { status: 200 });
    }

    const [chat] = await getChat(chatId);
    console.log("result", chat);
    const lastMessage = chat.messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") {
      return new Response(emptyDataStream, { status: 200 });
    }
    const streamWithMessage = createDataStream({
      execute: (b) => {
        b.writeData({
          type: "append-data",
          message: JSON.stringify(lastMessage),
        });
      },
    });
    return new Response(streamWithMessage, { status: 200 });
  },
});
