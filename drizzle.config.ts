import { defineConfig } from "drizzle-kit";
import { env } from "env";

export default defineConfig({
  dialect: "turso",
  schema: "./app/db/schema",
  out: "./app/db/schema/migrations",
  dbCredentials: {
    url: env.TURSO_URL,
    authToken: env.TURSO_KEY,
  },
});
