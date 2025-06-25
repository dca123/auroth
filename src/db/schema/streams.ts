import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const streams = sqliteTable("streams", {
  id: text("id").primaryKey(),
  chat_id: text("chat_id").notNull(),
});
