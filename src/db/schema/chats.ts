import { ChatMessage } from "@langchain/core/messages";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

// export type SimpleChatMessage = {
//   id?: string;
//   role: string;
//   // role: "assistant" | "user";
//   content: string;
// };
//
export type SimpleChatMessage = Pick<ChatMessage, "id" | "role" | "content">;
export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  messages: text("messages", { mode: "json" })
    .notNull()
    .$type<SimpleChatMessage[]>(),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch())`),
});
