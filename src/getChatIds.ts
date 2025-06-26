import { createServerFn } from "@tanstack/react-start";
import { appDb } from "@/db";
import { chats } from "@/db/schema/chats";

export const getChatIds = createServerFn().handler(async () => {
  console.log("herllo ");
  console.log(chats);
  const ids = await appDb.select().from(chats);
  // .orderBy(desc(chats.createdAt))
  // .limit(10);
  console.log("ids", ids);
  return ids;
});
