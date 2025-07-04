import { dotaDB } from "@/db";
import { SqlDatabase } from "langchain/sql_db";

export const aiDb = await SqlDatabase.fromDataSourceParams({
  appDataSource: {
    options: {
      type: "sqlite",
    },
    query: async (sql: string) => {
      // console.log("query", sql);
      const result = await dotaDB.run(sql);
      // console.log("db result", result);
      // console.log("\n");
      return result.rows;
    },
    initialize: () => {},
  },
});
