import { db } from "@/db";
import { chats } from "@/db/schema/chats";
import { eq } from "drizzle-orm";
import { Message } from "ai";
import { streams } from "@/db/schema/streams";

export async function storeChat(id: string, messages: Message[]) {
  const r = await db.insert(chats).values({ id, messages }).onConflictDoUpdate({
    target: chats.id,
    set: {
      messages,
    },
  });
}

export async function getChat(id: string) {
  const chat = await db.select().from(chats).where(eq(chats.id, id));
  if (chat.length < 1) {
    return [];
  }
  return chat;
}

export async function appendStreamId({
  chatId,
  streamId,
}: {
  chatId: string;
  streamId: string;
}) {
  await db.insert(streams).values({
    id: streamId,
    chat_id: chatId,
  });
}

export async function loadStreams(chatId: string) {
  const result = await db
    .select()
    .from(streams)
    .where(eq(streams.chat_id, chatId));
  return result;
}
