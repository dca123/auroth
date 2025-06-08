import { pull } from "langchain/hub";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { z } from "zod";
import { DataSource } from "typeorm";
import { SqlDatabase } from "langchain/sql_db";
import { QuerySqlTool } from "langchain/tools/sql";
import { StateGraph } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { env } from "env";

const datasource = new DataSource({
  type: "sqlite",
  database: "dota.db",
});

const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

const InputStateAnnotation = Annotation.Root({
  question: Annotation<string>,
  history: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

const StateAnnotation = Annotation.Root({
  question: Annotation<string>,
  query: Annotation<string>,
  result: Annotation<string>,
  answer: Annotation<string>,
  history: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
});
const queryPromptTemplate = await pull<ChatPromptTemplate>(
  "langchain-ai/sql-query-system-prompt",
);

const queryObject = z.object({
  query: z.string().describe("Syntactically valid SQL query"),
});

const structuredLLm = llm.withStructuredOutput(queryObject);

async function writeQuery(state: typeof InputStateAnnotation.State) {
  const promptValue = await queryPromptTemplate.invoke({
    dialect: db.appDataSourceOptions.type,
    top_k: 10,
    table_info: await db.getTableInfo(),
    input: state.question,
    datasource,
  });
  const promptValueWithHistory = state.history.concat(
    promptValue.toChatMessages(),
  );
  //console.log("with history", promptValueWithHistory);
  const result = await structuredLLm.invoke(promptValueWithHistory);
  return { query: result.query };
}

const executeQuery = async (state: typeof StateAnnotation.State) => {
  const executeQueryTool = new QuerySqlTool(db);
  return { result: await executeQueryTool.invoke(state.query) };
};

const generateAnswer = async (state: typeof StateAnnotation.State) => {
  const promptValue =
    "Given the following user question, corresponding SQL query, " +
    "and SQL result, answer the user question.\n\n" +
    `Question: ${state.question}\n` +
    `SQL Query: ${state.query}\n` +
    `SQL Result: ${state.result}\n`;
  const response = await llm.invoke(promptValue);
  return {
    answer: response.content,
    history: [new HumanMessage(state.question), response],
  };
};
const graphBuilder = new StateGraph({
  stateSchema: StateAnnotation,
})
  .addNode("writeQuery", writeQuery)
  .addNode("executeQuery", executeQuery)
  .addNode("generateAnswer", generateAnswer)
  .addEdge("__start__", "writeQuery")
  .addEdge("writeQuery", "executeQuery")
  .addEdge("executeQuery", "generateAnswer")
  .addEdge("generateAnswer", "__end__");

const checkpointer = PostgresSaver.fromConnString(env.POSTGRES_DATABASE_URL);
await checkpointer.setup();
const graph = graphBuilder.compile({ checkpointer });

export async function query(chatId: string, messages: BaseMessage[]) {
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    throw new Error("There is no last message / question from the user");
  }
  const question = lastMessage.content.toString();
  console.log("question", question);
  const stream = await graph.stream(
    {
      question,
      answer: undefined,
      history: messages,
    },
    {
      streamMode: "values",
      configurable: {
        thread_id: chatId,
      },
    },
  );
  return stream;
}
