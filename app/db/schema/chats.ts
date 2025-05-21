import { type Message } from "ai";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

type SimplifiedMessage = Pick<Message, "id" | "role" | "createdAt">;
export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  messages: text("messages", { mode: "json" })
    .notNull()
    .$type<SimplifiedMessage[]>(),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch())`),
});
