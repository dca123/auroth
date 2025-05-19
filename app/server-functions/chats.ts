import { db } from "@/db";
import { chats } from "@/db/schema/chats";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";

export const getChat = createServerFn()
  .validator((data: string) => data)
  .handler(async (ctx) => {
    const chat = await db.select().from(chats).where(eq(chats.id, ctx.data));
    if (chat.length < 1) {
      return [];
    }
    return chat;
  });

export const getChatIds = createServerFn().handler(async () => {
  const ids = await db
    .select({
      id: chats.id,
    })
    .from(chats)
    .orderBy(desc(chats.createdAt))
    .limit(10);
  return ids;
});
