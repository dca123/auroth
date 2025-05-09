import { drizzle } from "drizzle-orm/libsql";
import { dbCredentials } from "./load-credentials";

export const db = drizzle({
  connection: {
    url: dbCredentials.url,
    authToken: dbCredentials.token,
  },
});
