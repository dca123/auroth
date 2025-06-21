import { OpenAIEmbeddings } from "@langchain/openai";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Document } from "@langchain/core/documents";
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { query } from "./sql-agent-ai";

const datasource = new DataSource({
  type: "sqlite",
  database: "dota.db",
});

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

async function queryAsList(
  database: SqlDatabase,
  query: string,
): Promise<string[]> {
  const res: Array<{ [key: string]: string }> = JSON.parse(
    await database.run(query),
  )
    .flat()
    .filter((el: any) => el != null);

  const justValues: Array<string> = res
    .map((item) =>
      Object.values(item)[0]
        .replace(/\b\d+\b/g, "")
        .trim(),
    )
    .filter((e) => e !== "");
  return justValues;
}

function convertToDocument(opts: {
  pageContent: string;
  metadata: { table: string; columnName: string };
}) {
  return new Document(opts);
}

async function properNounsDocuments() {
  const heroes = (await queryAsList(db, "SELECT display_name from heroes")).map(
    (pageContent: string) =>
      convertToDocument({
        pageContent,
        metadata: { columnName: "display_name", table: "heroes" },
      }),
  );

  const items = (await queryAsList(db, "SELECT display_name from items")).map(
    (pageContent: string) =>
      convertToDocument({
        pageContent,
        metadata: { columnName: "display_name", table: "items" },
      }),
  );

  const playerNames = (
    await queryAsList(db, "SELECT name from team_players")
  ).map((pageContent: string) =>
    convertToDocument({
      pageContent,
      metadata: { columnName: "name", table: "team_players" },
    }),
  );

  const teams = (await queryAsList(db, "SELECT name from teams")).map(
    (pageContent: string) =>
      convertToDocument({
        pageContent,
        metadata: { columnName: "name", table: "team" },
      }),
  );

  const properNouns = heroes.concat(items, playerNames, teams);
  return properNouns;
}

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const vectorStore = new MemoryVectorStore(embeddings);
const documents = await properNounsDocuments();
await vectorStore.addDocuments(documents);

const retriever = vectorStore.asRetriever(5);
export const retrieverTool = tool(
  async (opts) => {
    const result = await retriever.invoke(opts.query);
    console.log(result);
    return result
      .map(
        (doc, idx) =>
          `Result ${idx + 1}:\nContent: ${doc.pageContent}\nMetadata: ${JSON.stringify(doc.metadata)}`,
      )
      .join("\n\n");
  },
  {
    name: "searchProperNouns",
    description:
      "Use to look up values to filter on. Input is an approximate spelling " +
      "of the proper noun, output is valid proper nouns. Use the noun most " +
      "similar to the search.",
    schema: z.object({
      query: z.string().describe("The proper noun to search for"),
    }),
  },
);

//
//export const retrieverTool = createRetrieverTool(retriever, {
//  name: "searchProperNouns",
//  description:
//    "Use to look up values to filter on. Input is an approximate spelling " +
//    "of the proper noun, output is valid proper nouns. Use the noun most " +
//    "similar to the search.",
//});
