import { query } from "@/ai/sql-single-queries";
import {
  appendChatMessages,
  getChat,
  simpleChatMessageToLangChainMessage,
  storeChat,
} from "@/lib/chat-store";
import { randomIdGenerator } from "@/lib/random";
import { AIMessage, ChatMessage, HumanMessage } from "@langchain/core/messages";
import { createServerFileRoute } from "@tanstack/react-start/server";

export const createChatId = randomIdGenerator(10);
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
    const chatMessages = simpleChatMessageToLangChainMessage(chat.messages);
    const messages = appendChatMessages({
      messages: chatMessages,
      newMessage: new ChatMessage({
        role: "assistant",
        content: message,
      }),
    });

    console.log(messages);

    const result = await query(chatId, messages, {
      onCompleted: async (message) => {
        const newMessages = appendChatMessages({
          messages,
          newMessage: new ChatMessage({
            content: message,
            role: "assistant",
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
