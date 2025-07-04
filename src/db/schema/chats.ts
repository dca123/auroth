import { StoredMessage } from "@langchain/core/messages";
import { sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { z } from "zod/v4";

export const StrictStoredMessageData = z.looseObject({
  id: z.string().min(5),
  role: z.enum(["assistant", "user"]),
  content: z.string(),
});
type StrictStoredMessageData = z.infer<typeof StrictStoredMessageData>;

export type StrictStoredMessage = Omit<StoredMessage, "data"> & {
  data: Omit<StoredMessage["data"], "id" | "role" | "content"> &
    RemoveIndex<StrictStoredMessageData>;
};

type RemoveIndex<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K];
};

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  messages: text("messages", { mode: "json" })
    .notNull()
    .$type<StrictStoredMessage[]>(),
  createdAt: integer("created_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "number" })
    .notNull()
    .default(sql`(unixepoch())`),
});
