import { drizzle } from "drizzle-orm/libsql";
import { env } from "env";

export const db = drizzle({
  connection: {
    url: env.TURSO_URL,
    authToken: env.TURSO_KEY,
  },
});

export const dotaDB = drizzle({
  connection: {
    url: env.DOTA_DB_URL,
    authToken: env.DOTA_DB_TOKEN,
  },
});
