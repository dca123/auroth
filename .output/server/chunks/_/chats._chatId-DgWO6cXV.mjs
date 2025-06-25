import { jsx } from 'react/jsx-runtime';
import { C as Chat } from './chat-DHpsBqHt.mjs';
import { R as Route } from './ssr.mjs';
import '@ai-sdk/react';
import '@tanstack/react-router';
import 'react';
import '@radix-ui/react-slot';
import 'class-variance-authority';
import 'lucide-react';
import 'clsx';
import 'tailwind-merge';
import '@radix-ui/react-dialog';
import '@radix-ui/react-tooltip';
import '@radix-ui/react-separator';
import 'drizzle-orm/libsql';
import '@t3-oss/env-core';
import 'zod';
import 'drizzle-orm';
import 'drizzle-orm/sqlite-core';
import 'ai';
import 'resumable-stream';
import '@vercel/functions';
import '@langchain/openai';
import 'langchain/agents/toolkits/sql';
import 'langchain/sql_db';
import 'typeorm';
import 'langchain/hub';
import '@langchain/langgraph/prebuilt';
import '@langchain/core/documents';
import 'langchain/vectorstores/memory';
import '@langchain/core/tools';
import '@langchain/core/messages';
import 'node:async_hooks';
import 'node:stream';
import 'react-dom/server';
import 'node:stream/web';

const SplitComponent = function Home() {
  const data = Route.useLoaderData();
  const {
    chatId
  } = Route.useParams();
  return /* @__PURE__ */ jsx(Chat, { chat: data, id: chatId });
};

export { SplitComponent as component };
//# sourceMappingURL=chats._chatId-DgWO6cXV.mjs.map
