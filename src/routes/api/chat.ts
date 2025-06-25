import {
  appendResponseMessages,
  createDataStream,
  generateId,
  LangChainAdapter,
} from "ai";
import { createResumableStreamContext } from "resumable-stream";
import { waitUntil } from "@vercel/functions";
import {
  appendStreamId,
  getChat,
  loadStreams,
  storeChat,
} from "@/lib/chat-store";
import { query } from "@/lib/sql-agent-ai";
import { transformMessages } from "@/lib/ai-sdk-to-langchain-message";
import { createServerFileRoute } from '@tanstack/react-start/server'


//@ts-expect-error
export const ServerRoute = createServerFileRoute("/api/chat").methods({
  POST: async ({ request }) => {
    const streamContext = createResumableStreamContext({
      waitUntil,
    });
    const { messages, id } = await request.json();
    const streamId = generateId();
    await appendStreamId({ chatId: id, streamId });
    console.log("appended stream id", streamId);
    const transformedMessages = transformMessages(messages);
    const result = await query(id, transformedMessages);
    const stream = createDataStream({
      execute: async (stream) => {
        console.log("success");
        LangChainAdapter.mergeIntoDataStream(result, {
          dataStream: stream,
          callbacks: {
            async onFinal(completion) {
              await storeChat(
                id,
                appendResponseMessages({
                  messages,
                  responseMessages: [
                    {
                      content: completion,
                      role: "assistant",
                      id: generateId(),
                    },
                  ],
                }),
              );
            },
          },
        });
      },
    });
    console.log("returned post request");
    return new Response(
      await streamContext.createNewResumableStream(streamId, () => stream),
    );
  },
  GET: async ({ request }) => {
    const { searchParams } = new URL(request.url);
    const streamContext = createResumableStreamContext({
      waitUntil,
    });
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      console.log("id is required");
      return new Response("id is required", { status: 400 });
    }
    const streamIds = await loadStreams(chatId);
    if (!streamIds.length) {
      console.log("No Streams found");
      return new Response("No Streams found", { status: 404 });
    }
    const lastStreamId = streamIds.at(-1)?.id;
    if (!lastStreamId) {
      console.log("No recent stream found");
      return new Response("No recent stream found", { status: 404 });
    }
    console.log("lastStreamId", lastStreamId);

    const emptyDataStream = createDataStream({
      execute: () => {},
    });
    const stream = await streamContext.resumeExistingStream(lastStreamId);
    if (stream) {
      console.log("found stream");
      return new Response(stream, { status: 200 });
    }

    console.log("stream is already done");

    const [chat] = await getChat(chatId);
    console.log("result", chat);
    const lastMessage = chat.messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") {
      return new Response(emptyDataStream, { status: 200 });
    }
    const streamWithMessage = createDataStream({
      execute: (b) => {
        b.writeData({
          type: "append-message",
          message: JSON.stringify(lastMessage),
        });
      },
    });
    return new Response(streamWithMessage, { status: 200 });
  },
});
