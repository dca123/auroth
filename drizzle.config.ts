import { dbCredentials } from "@/db/load-credentials";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./app/db/schema",
  out: "./app/db/schema/migrations",
  dbCredentials: {
    url: dbCredentials.url,
    authToken: dbCredentials.token,
  },
});
