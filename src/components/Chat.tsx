import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { getChat } from "@/routes/chats.$chatId";
import { FormEvent, useRef, useState } from "react";
import { randomIdGenerator } from "@/lib/random";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";

const createMessaageId = randomIdGenerator(10);

export function Chat(props: {
  chat?: Awaited<ReturnType<typeof getChat>>;
  id?: string;
}) {
  const navigate = useNavigate();
  console.log({
    id: props.id,
    initialMessages: props.chat[0].messages,
  });
  const { submit, messages, input, setInput, isStreaming } = useChat({
    id: props.id,
    initialMessages: props.chat[0].messages,
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
  initialMessages?: BaseMessage[];
};

function useChat(props: UseChatProps) {
  const [messages, setMessages] = useState<BaseMessage[]>(
    props.initialMessages ?? [],
  );
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const submit = async () => {
    setMessages((messages) => [
      ...messages,
      new HumanMessage({
        id: createMessaageId(),
        content: input,
      }),
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
            new AIMessage({
              id,
              content: value,
            }),
          ];
        }
        return [
          ...prevMessages.slice(0, -1),
          new AIMessage({
            ...lastMessage,
            content: lastMessage.content + value,
          }),
        ];
      });
      return reader.read().then(pump);
    });
  };
  return { messages, submit, input, setInput, isStreaming };
}

function ChatMessage(props: { message: BaseMessage }) {
  return (
    <div
      className={cn(
        "p-3 rounded-xl w-fit",
        props.message instanceof HumanMessage && "self-end bg-card",
      )}
    >
      <p>{props.message.content.toString()}</p>
    </div>
  );
}
