import { OpenAIEmbeddings } from "@langchain/openai";
import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { env } from "env";
import { createClient } from "@libsql/client";

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
});

const libsqlClient = createClient({
  url: env.TURSO_URL,
  authToken: env.TURSO_KEY,
});

export const properNounVectorStore = new LibSQLVectorStore(embeddings, {
  db: libsqlClient,
  table: "proper_noun_embeddings",
  column: "EMBEDDING_COLUMN",
});

const retriever = properNounVectorStore.asRetriever(5);
export const retrieverTool = tool(
  async (opts) => {
    const result = await retriever.invoke(opts.query);
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
