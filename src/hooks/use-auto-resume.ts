import { UseChatHelpers } from "@ai-sdk/react";
import { UIMessage } from "ai";
import { useEffect } from "react";

type DataPart = { type: "append-message"; message: string };
export function useAutoResume(props: {
  autoResume: boolean;
  initialMessages: UIMessage[];
  experimental_resume: UseChatHelpers["experimental_resume"];
  data: UseChatHelpers["data"];
  setMessages: UseChatHelpers["setMessages"];
}) {
  useEffect(() => {
    if (!props.autoResume) return;
    const mostRecentMessage = props.initialMessages.at(-1);
    if (mostRecentMessage?.role !== "user") {
      props.experimental_resume();
    }
  }, []);

  useEffect(() => {
    if (!props.data || props.data.length === 0) return;
    const dataPart = props.data[0] as DataPart;
    if (dataPart.type === "append-message") {
      const message = JSON.parse(dataPart.message) as UIMessage;
      props.setMessages([...props.initialMessages, message]);
    }
  }, [props.data, props.initialMessages, props.setMessages]);
}
