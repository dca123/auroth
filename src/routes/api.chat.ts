import { query } from "@/ai/sql-single-queries";
import { appendChatMessages, getChat, storeChat } from "@/lib/chat-store";
import { randomIdGenerator } from "@/lib/random";
import {
  ChatMessage,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import { createServerFileRoute } from "@tanstack/react-start/server";

export const createChatId = randomIdGenerator(10);
export const createMessageId = randomIdGenerator(10);
export const ServerRoute = createServerFileRoute("/api/chat").methods({
  POST: async ({ request }) => {
    const { id, message } = (await request.json()) as {
      id?: string;
      message: string;
    };
    const chatId = id ?? createChatId();
    const chat = await getChat(chatId);
    if (chat instanceof Error) {
      throw chat;
    }
    const chatMessages = mapStoredMessagesToChatMessages(chat.messages);
    const messages = appendChatMessages({
      messages: chatMessages,
      newMessage: new ChatMessage({
        role: "user",
        content: message,
      }),
    });
    console.log("1", messages.at(-1)?.id);

    const result = await query(chatId, messages, {
      onCompleted: async (message) => {
        const newMessages = appendChatMessages({
          messages,
          newMessage: new ChatMessage({
            role: "assistant",
            id: message.id,
            additional_kwargs: message.additional_kwargs,
            response_metadata: message.response_metadata,
            content: message.content,
            name: message.name,
          }),
        });
        await storeChat(chatId, newMessages);
        console.log(`"Completed with message: ${message}"`);
      },
    });
    if (result instanceof Error) {
      throw result;
    }
    return new Response(result);
  },
});
