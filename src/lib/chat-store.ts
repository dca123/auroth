import { appDb } from "@/db";
import { chats, SimpleChatMessage } from "@/db/schema/chats";
import { eq } from "drizzle-orm";
import { streams } from "@/db/schema/streams";
import { ChatMessage } from "@langchain/core/messages";

export function appendChatMessages({
  messages,
  newMessage,
}: {
  messages: ChatMessage[];
  newMessage: ChatMessage;
}) {
  return messages.concat(newMessage);
}

export function simpleChatMessageToLangChainMessage(
  messages: SimpleChatMessage[],
) {
  return messages.map((m) => new ChatMessage(m.content.toString(), m.role));
}

export async function storeChat(id: string, messages: ChatMessage[]) {
  const r = await appDb
    .insert(chats)
    .values({ id, messages })
    .onConflictDoUpdate({
      target: chats.id,
      set: {
        messages,
      },
    });
}

export async function getChat(id: string) {
  const chat = await appDb.select().from(chats).where(eq(chats.id, id));
  if (chat.length < 1 || chat[0] === undefined) {
    return new Error("No such chat");
  }
  return chat[0];
}

export async function appendStreamId({
  chatId,
  streamId,
}: {
  chatId: string;
  streamId: string;
}) {
  await appDb.insert(streams).values({
    id: streamId,
    chat_id: chatId,
  });
}

export async function loadStreams(chatId: string) {
  const result = await appDb
    .select()
    .from(streams)
    .where(eq(streams.chat_id, chatId));
  return result;
}
