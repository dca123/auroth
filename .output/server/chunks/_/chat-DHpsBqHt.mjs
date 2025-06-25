import { jsxs, jsx } from 'react/jsx-runtime';
import { useChat } from '@ai-sdk/react';
import { c as cn } from './ssr.mjs';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsx(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    }
  );
}
function Chat(props) {
  var _a, _b;
  const {
    messages,
    input,
    handleSubmit,
    handleInputChange,
    id,
    experimental_resume,
    setMessages,
    data
  } = useChat({
    id: props.id,
    initialMessages: (_b = (_a = props.chat) == null ? void 0 : _a[0]) == null ? void 0 : _b.messages,
    sendExtraMessageFields: true
  });
  console.log(id);
  const navigate = useNavigate();
  function onSubmit(e) {
    if (messages.length < 1) {
      navigate({
        to: "/chats/$chatId",
        params: {
          chatId: id
        }
      });
    }
    return handleSubmit(e);
  }
  useEffect(() => {
    experimental_resume();
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "relative h-full", children: [
    /* @__PURE__ */ jsx("div", { className: "space-y-2 flex flex-col", children: messages.map((m) => /* @__PURE__ */ jsx(ChatMessage, { message: m }, m.id)) }),
    /* @__PURE__ */ jsx("form", { onSubmit, children: /* @__PURE__ */ jsx(
      Input,
      {
        className: "absolute bottom-1",
        placeholder: "Say hi to Auroth",
        onChange: handleInputChange,
        value: input
      }
    ) })
  ] });
}
function ChatMessage(props) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "p-3 rounded-xl w-fit",
        props.message.role === "user" && "self-end bg-card"
      ),
      children: /* @__PURE__ */ jsx("p", { children: props.message.content })
    }
  );
}

export { Chat as C };
//# sourceMappingURL=chat-DHpsBqHt.mjs.map
