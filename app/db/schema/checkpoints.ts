import {
  integer,
  sqliteTable,
  text,
  blob,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const checkpoints = sqliteTable(
  "checkpoints",
  {
    thread_id: text("thread_id").notNull(),
    checkpoint_ns: text("checkpoint_ns").notNull().default(""),
    checkpoint_id: text("checkpoint_id").notNull(),
    parent_checkpoint_id: text("parent_checkpoint_id"),
    type: text("type"),
    checkpoint: text("checkpoint"),
    metadata: text("metadata"),
  },
  (table) => [
    primaryKey({
      columns: [table.thread_id, table.checkpoint_ns, table.checkpoint_id],
    }),
  ],
);

export const writes = sqliteTable(
  "writes",
  {
    thread_id: text("thread_id").notNull(),
    checkpoint_ns: text("checkpoint_ns").notNull().default(""),
    checkpoint_id: text("checkpoint_id").notNull(),
    task_id: text("task_id").notNull(),
    idx: integer("idx").notNull(),
    channel: text("channel").notNull(),
    type: text("type"),
    value: text("value"),
  },
  (table) => [
    primaryKey({
      columns: [
        table.thread_id,
        table.checkpoint_ns,
        table.checkpoint_id,
        table.task_id,
        table.idx,
      ],
    }),
  ],
);
