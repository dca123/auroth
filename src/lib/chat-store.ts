import { appDb } from "@/db";
import {
  chats,
  StrictStoredMessage,
  StrictStoredMessageData,
} from "@/db/schema/chats";
import { eq } from "drizzle-orm";
import { streams } from "@/db/schema/streams";
import {
  BaseMessage,
  ChatMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";

export function appendChatMessages({
  messages,
  newMessage,
}: {
  messages: BaseMessage[];
  newMessage: ChatMessage;
}) {
  return messages.concat(newMessage);
}

export async function storeChat(id: string, messages: BaseMessage[]) {
  const storedMessages = mapChatMessagesToStoredMessages(messages);
  const strictStoredMessages = storedMessages.map((m) => ({
    ...m,
    data: {
      ...m.data,
      ...StrictStoredMessageData.parse(m.data),
    },
  }));
  const r = await appDb
    .insert(chats)
    .values({ id, messages: strictStoredMessages })
    .onConflictDoUpdate({
      target: chats.id,
      set: {
        messages: strictStoredMessages,
      },
    });
}

export async function getChat(id: string) {
  const result = await appDb.select().from(chats).where(eq(chats.id, id));
  if (result.length < 1 || result[0] === undefined) {
    return new Error("No such chat");
  }
  return result[0];
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
