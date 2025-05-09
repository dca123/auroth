import { createAPIFileRoute } from "@tanstack/react-start/api";
import { Message, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/db";
import { chats } from "@/db/schema/chats";
import { eq } from "drizzle-orm";

export const APIRoute = createAPIFileRoute("/api/chat")({
  POST: async ({ request, params }) => {
    const { messages, id } = await request.json();
    console.log(messages);
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });
    console.log(result);
    return result.toDataStreamResponse();
  },
});

async function storeChat(id: string, messages: Message[]) {
  const result = await db.select().from(chats).where(eq(chats.id, id));
  if (result.length === 1) {
  }

  throw new Error("test");
}
