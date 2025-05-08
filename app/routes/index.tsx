import { createFileRoute } from "@tanstack/react-router";
import { useChat, Message } from "@ai-sdk/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { messages, input, handleSubmit, handleInputChange } = useChat({});
  return (
    <div className="relative h-full">
      <div className="space-y-2 flex flex-col">
        {messages.map((m) => (
          <ChatMessage message={m} />
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <Input
          className="absolute bottom-1"
          placeholder="Say hi to Auroth"
          onChange={handleInputChange}
          value={input}
        />
      </form>
    </div>
  );
}

function ChatMessage(props: { message: Message }) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl w-fit",
        props.message.role === "user" && "self-end bg-card",
      )}
    >
      <p>{props.message.content}</p>
    </div>
  );
}
