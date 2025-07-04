import { appDb } from "@/db";
import { Document } from "@langchain/core/documents";
import { SqlDatabase } from "langchain/sql_db";
import { properNounVectorStore } from "./proper-nouns-retriever";
import { sql } from "drizzle-orm";
import { aiDb } from "./ai-db";

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

async function getNewEntries(columnName: string, table: string) {
  const properNouns = await queryAsList(
    aiDb,
    `SELECT  ${columnName} from ${table}`,
  );
  const newProperNouns = properNouns.map(async (pageContent) => {
    const query = sql`SELECT EXISTS(SELECT 1 FROM proper_noun_embeddings WHERE content = ${pageContent}) AS [exists]`;
    const result: { exists: 1 | 0 } = await appDb.get(query);
    if (result.exists == 1) return undefined;
    return convertToDocument({
      pageContent,
      metadata: { columnName, table },
    });
  });
  return Promise.all(newProperNouns);
}

async function properNounsDocuments() {
  const heroes = getNewEntries("display_name", "heroes");
  const items = getNewEntries("display_name", "items");
  const playerNames = getNewEntries("name", "team_players");
  const teams = getNewEntries("name", "teams");

  const res = await Promise.all([heroes, items, playerNames, teams]);
  const properNouns = res
    .reduce((acc, cur) => acc.concat(cur), [])
    .filter((v) => v !== undefined);
  return properNouns;
}

async function main() {
  console.log("Searching Proper Nouns");
  const properNouns = await properNounsDocuments();
  console.log(`Adding ${properNouns.length} Proper Nouns`);
  await properNounVectorStore.addDocuments(properNouns);
  console.log("Completed adding proper nouns");
}

async function testStore() {
  const result = await properNounVectorStore.similaritySearch("axe", 1);

  for (const doc of result) {
    console.log(`${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
  }
}
// main();
testStore();
