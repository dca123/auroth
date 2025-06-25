import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Message } from "ai";

export function transformMessages(messages: Message[]): BaseMessage[] {
  const result = messages.map((message) => {
    const { id, content, ...additionalData } = message;
    if (message.role === "user") {
      return new HumanMessage({
        id,
        content,
        response_metadata: {
          ...additionalData,
        },
      });
    }
    return new AIMessage({
      id,
      content,
      response_metadata: {
        ...additionalData,
      },
    });
  });

  return result;
}
