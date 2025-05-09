import { Message } from "ai";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const chats = sqliteTable("chats", {
  id: text("id"),
  messages: text("messages", { mode: "json" }).$type<Message[]>(),
});
