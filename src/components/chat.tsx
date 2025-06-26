import { getChat } from "@/server-functions/chats";
import { Message, useChat } from "@ai-sdk/react";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAutoResume } from "@/hooks/use-auto-resume";

export function Chat(props: {
  chat?: Awaited<ReturnType<typeof getChat>>;
  id?: string;
}) {
  const {
    messages,
    input,
    handleSubmit,
    handleInputChange,
    id,
    experimental_resume,
    setMessages,
    data,
  } = useChat({
    id: props.id,
    initialMessages: props.chat?.[0]?.messages as Message[],
    sendExtraMessageFields: true,
  });
  console.log(id);
  const navigate = useNavigate();

  function onSubmit(e) {
    if (messages.length < 1) {
      navigate({
        to: "/chats/$chatId",
        params: {
          chatId: id,
        },
      });
    }
    return handleSubmit(e);
  }

  useEffect(() => {
    experimental_resume();
  }, []);

  //useAutoResume({
  //  autoResume: true,
  //  initialMessages: (props.chat?.[0]?.messages ?? []) as Message[],
  //  experimental_resume,
  //  data,
  //  setMessages,
  //});

  return (
    <div className="relative h-full">
      <div className="space-y-2 flex flex-col">
        {messages.map((m) => (
          <ChatMessage message={m} key={m.id} />
        ))}
      </div>
      <form onSubmit={onSubmit}>
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
