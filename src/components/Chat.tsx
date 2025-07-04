import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { randomIdGenerator } from "@/lib/random";
import { getChatServerFn } from "@/routes/chats.$chatId";

const createMessaageId = randomIdGenerator(10);
type SimpleChatMessage = {
  id: string;
  role: string;
  content: string;
};

export function Chat(props: {
  chat?: Awaited<ReturnType<typeof getChatServerFn>>;
  id?: string;
}) {
  const navigate = useNavigate();
  console.log({
    id: props.id,
    initialMessages: props.chat?.messages,
  });
  props.chat?.messages[0].data.role;
  const { submit, messages, input, setInput, isStreaming } = useChat({
    id: props.id,
    initialMessages: props.chat?.messages.map(
      (m) =>
        ({
          id: m.data.id ?? createMessaageId(),
          content: m.data.content,
          role: m.data.role,
        }) satisfies SimpleChatMessage,
    ),
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

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
          disabled={isStreaming}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}

type UseChatProps = {
  id?: string;
  initialMessages?: SimpleChatMessage[];
};

function useChat(props: UseChatProps) {
  const [messages, setMessages] = useState<SimpleChatMessage[]>(
    props.initialMessages ?? [],
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const submit = async () => {
    setMessages((messages) => [
      ...messages,
      {
        id: createMessaageId(),
        role: "user",
        content: input,
      },
    ]);
    setInput("");
    setIsStreaming(true);
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ id: props.id, message: input }),
    });
    if (!response.body) return;
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let firstChunkRef = true;
    const id = createMessaageId();
    reader.read().then(function pump({ done, value }) {
      if (done) {
        setIsStreaming(false);
        return;
      }

      setMessages((prevMessages) => {
        const lastMessage = prevMessages.at(-1);
        console.log(
          "setting message",
          prevMessages,
          firstChunkRef,
          lastMessage === undefined,
        );
        if (lastMessage === undefined || lastMessage.id !== id) {
          firstChunkRef = false;
          return [
            ...prevMessages,
            {
              id,
              role: "assistant",
              content: value,
            },
          ];
        }
        return [
          ...prevMessages.slice(0, -1),
          {
            ...lastMessage,
            role: "assistant",
            content: lastMessage.content + value,
          },
        ];
      });
      return reader.read().then(pump);
    });
  };
  return { messages, submit, input, setInput, isStreaming };
}

function ChatMessage(props: { message: SimpleChatMessage }) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl w-fit",
        props.message.role === "user" && "self-end bg-card",
      )}
    >
      <p>{props.message.content.toString()}</p>
    </div>
  );
}
