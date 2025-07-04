import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export type SimpleChatMessage = {
  id: string;
  role: "assistand" | "user";
  content: string;
};
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
