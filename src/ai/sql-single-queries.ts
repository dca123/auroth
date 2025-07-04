import { pull } from "langchain/hub";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { z } from "zod";
import { QuerySqlTool } from "langchain/tools/sql";
import { StateGraph } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { aiDb } from "./ai-db";
import {
  StreamEvent,
  StreamEventData,
} from "@langchain/core/tracers/log_stream";
import { sleep } from "@/lib/devtools";

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
const finalModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
}).withConfig({
  tags: ["final_node"],
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
    dialect: aiDb.appDataSourceOptions.type,
    top_k: 10,
    table_info: await aiDb.getTableInfo(),
    input: state.question,
  });
  const promptValueWithHistory = state.history.concat(
    promptValue.toChatMessages(),
  );
  const result = await structuredLLm.invoke(promptValueWithHistory);
  return { query: result.query };
}

const executeQuery = async (state: typeof StateAnnotation.State) => {
  const executeQueryTool = new QuerySqlTool(aiDb);
  console.log({ query: state.query });
  return { result: await executeQueryTool.invoke(state.query) };
};

const generateAnswer = async (state: typeof StateAnnotation.State) => {
  const promptValue =
    "Given the following user question, corresponding SQL query, " +
    "and SQL result, answer the user question.\n\n" +
    `Question: ${state.question}\n` +
    `SQL Query: ${state.query}\n` +
    `SQL Result: ${state.result}\n`;
  const response = await finalModel.invoke(promptValue);
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

const graph = graphBuilder.compile({});

export async function query(
  chatId: string,
  messages: BaseMessage[],
  callbacks?: Callbacks,
) {
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return new Error("There is no last message / question from the user");
  }
  const question = lastMessage.content.toString();
  console.log("question", question);
  const inputs = {
    question,
    answer: undefined,
    history: messages,
  };
  const configurable = {
    thread_id: chatId,
  };
  const [stream, callbacksStream] = graph
    .streamEvents(inputs, {
      configurable,
      version: "v2",
    })
    .tee();

  if (callbacks !== undefined) {
    triggerCallbacks(callbacksStream, callbacks);
  }
  const streamTransformer = new TransformStream<StreamEvent>({
    async transform(chunk, controller) {
      const { event, tags, data } = chunk;
      if (event === "on_chat_model_stream" && tags?.includes("final_node")) {
        if (data.chunk.content) {
          controller.enqueue(data.chunk.content);
          await sleep(300);
          console.log(data.chunk.content, "|");
        }
      }
    },
  });
  return stream.pipeThrough(streamTransformer);
}
type Callbacks = {
  onCompleted?: (message: string) => void;
};

function triggerCallbacks(
  stream: ReadableStream<StreamEvent>,
  callbacks: Callbacks,
) {
  const reader = stream.getReader();
  let output = "";
  reader.read().then(function pump({ done, value }) {
    if (done) {
      if (callbacks.onCompleted !== undefined) {
        callbacks.onCompleted(output);
      }
      return;
    }

    if (
      value.event === "on_chat_model_end" &&
      value.tags?.includes("final_node")
    ) {
      output = value.data.output.content;
    }
    return reader.read().then(pump);
  });
}
