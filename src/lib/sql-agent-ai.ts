import { ChatOpenAI } from "@langchain/openai";
import { SqlToolkit } from "langchain/agents/toolkits/sql";
import { pull } from "langchain/hub";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { BaseMessage } from "@langchain/core/messages";
import { retrieverTool } from "./proper-nouns-retriever";
import { SqlDatabase } from "./sql-database";
import { dotaDB } from "@/db";

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: {
    options: {
      schema: "public",
      type: "sqlite",
    },
    query: async (sql) => {
      console.log("query", sql);
      const result = await dotaDB.run(sql);
      console.log("db result", result);
      console.log("\n");
      return result.rows;
    },
  },
});

const llm = new ChatOpenAI({
  model: "o4-mini",
  temperature: 1,
});

const sqlToolkit = new SqlToolkit(db, llm);
const tools = sqlToolkit.getTools().concat(retrieverTool);

const systemPromptTemplate = await pull<ChatPromptTemplate>(
  "langchain-ai/sql-agent-system-prompt",
);
let suffix =
  "\nIf you need to filter on a proper noun like a Name, you must ALWAYS first look up " +
  "the filter value using the 'search_proper_nouns' tool! Do not try to " +
  "guess at the proper name - use this function to find similar ones. The pageContent attribute is the proper name, and the metadata attribute includes which table and column that proper name is from.";
const systemMessage = await systemPromptTemplate.format({
  dialect: "SQLite",
  top_k: 5,
});
const system = systemMessage + suffix;

const agent = createReactAgent({
  llm: llm,
  tools: tools,
  stateModifier: system,
});

export async function query(chatId: string, messages: BaseMessage[]) {
  const stream = await agent.stream(
    {
      messages,
    },
    { configurable: { thread_id: chatId } },
  );
  const transformerStream = new TransformStream({
    transform(chunk, controller) {
      console.log(chunk);
      if (
        chunk.agent &&
        chunk.agent.messages.at(-1).response_metadata.finish_reason === "stop"
      ) {
        controller.enqueue(chunk.agent.messages.at(-1).content);
      }
    },
  });
  return stream.pipeThrough(transformerStream);
}
