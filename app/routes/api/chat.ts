import { createAPIFileRoute } from "@tanstack/react-start/api";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export const APIRoute = createAPIFileRoute("/api/chat")({
  POST: async ({ request, params }) => {
    const { messages } = await request.json();
    console.log(messages);
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });
    console.log(result);
    return result.toDataStreamResponse();
  },
});
