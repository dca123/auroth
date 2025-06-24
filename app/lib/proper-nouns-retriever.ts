import { OpenAIEmbeddings } from "@langchain/openai";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { Document } from "@langchain/core/documents";
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { spawnSync } from "child_process";

// --- Database & Retriever Setup ---
const datasource = new DataSource({
  type: "sqlite",
  database: "dota.db",
});
await datasource.initialize();

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

async function queryAsList(
  database: SqlDatabase,
  query: string,
): Promise<string[]> {
  const rowsJson = await database.run(query);
  const rows = JSON.parse(rowsJson)
    .flat()
    .filter((item: any) => item != null);

  return rows
    .map((row: Record<string, string>) =>
      Object.values(row)[0]
        .replace(/\b\d+\b/g, "")
        .trim(),
    )
    .filter((value) => value !== "");
}

function convertToDocument(opts: {
  pageContent: string;
  metadata: { table: string; columnName: string };
}) {
  return new Document(opts);
}

async function properNounsDocuments() {
  const heroes = await queryAsList(db, "SELECT display_name FROM heroes");
  const items = await queryAsList(db, "SELECT display_name FROM items");
  const players = await queryAsList(db, "SELECT name FROM team_players");
  const teams = await queryAsList(db, "SELECT name FROM teams");

  return [
    ...heroes.map((name) => convertToDocument({ pageContent: name, metadata: { table: "heroes", columnName: "display_name" } })),
    ...items.map((name) => convertToDocument({ pageContent: name, metadata: { table: "items", columnName: "display_name" } })),
    ...players.map((name) => convertToDocument({ pageContent: name, metadata: { table: "team_players", columnName: "name" } })),
    ...teams.map((name) => convertToDocument({ pageContent: name, metadata: { table: "teams", columnName: "name" } })),
  ];
}

// Embedding-based retriever for proper nouns
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-large" });
const vectorStore = new MemoryVectorStore(embeddings);
try {
  const docs = await properNounsDocuments();
  await vectorStore.addDocuments(docs);
} catch (e) {
  console.error("error adding documents to vector store:", e);
}
const retriever = vectorStore.asRetriever(5);

export const searchProperNouns = tool(
  async ({ query }) => {
    const results = await retriever.getRelevantDocuments(query);
    return results
      .map(
        (doc, idx) =>
          `Result ${idx + 1}:\nContent: ${doc.pageContent}\nMetadata: ${JSON.stringify(doc.metadata)}`,
      )
      .join("\n\n");
  },
  {
    name: "searchProperNouns",
    description:
      "lookup approximate spellings of heroes, items, players, or teams and return the best matches.",
    schema: z.object({ query: z.string().describe("fuzzy proper noun") }),
  },
);

// --- Named Entity Recognition Tool (using NLTK via Python) ---
// requires a `ner.py` script alongside this file that reads text from stdin and outputs JSON.
export const extractNamedEntities = tool(
  ({ text }) => {
    const py = spawnSync("python3", ["./ner.py"], { input: text, encoding: "utf-8" });
    if (py.error) throw py.error;
    const raw = py.stdout.trim();
    try {
      return JSON.parse(raw) as Array<{ entity: string; type: string }>;
    } catch (err) {
      throw new Error(`failed to parse NER output: ${raw}`);
    }
  },
  {
    name: "extractNamedEntities",
    description: "extract named entities from text using NLTK, returning [{entity,type}].",
    schema: z.object({ text: z.string().describe("input text for NER") }),
  },
);
