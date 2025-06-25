import { a as createServerRpc, b as createServerFn, d as db$2, e as chats } from './ssr.mjs';
import { desc, eq } from 'drizzle-orm';
import '@tanstack/react-router';
import 'react/jsx-runtime';
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

const getChat_createServerFn_handler = createServerRpc("src_server-functions_chats_ts--getChat_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return getChat.__executeServer(opts, signal);
});
const getChatIds_createServerFn_handler = createServerRpc("src_server-functions_chats_ts--getChatIds_createServerFn_handler", "/_serverFn", (opts, signal) => {
  return getChatIds.__executeServer(opts, signal);
});
const getChat = createServerFn().validator((data) => data).handler(getChat_createServerFn_handler, async (ctx) => {
  const chat = await db$2.select().from(chats).where(eq(chats.id, ctx.data));
  if (chat.length < 1) {
    return [];
  }
  return chat;
});
const getChatIds = createServerFn().handler(getChatIds_createServerFn_handler, async () => {
  const ids = await db$2.select({
    id: chats.id,
    messages: chats.messages
  }).from(chats).orderBy(desc(chats.createdAt)).limit(10);
  return ids;
});

export { getChatIds_createServerFn_handler, getChat_createServerFn_handler };
//# sourceMappingURL=chats-ix_49ujY.mjs.map
