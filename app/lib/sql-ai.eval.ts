import { evalite } from "evalite";
import { generateId, streamText } from "ai";
import { AnswerSimilarity, Factuality, Levenshtein } from "autoevals";
import { query } from "./sql-ai";
import { HumanMessage } from "@langchain/core/messages";
import { ConstrainedFactuality } from "./constrained-factuality-scorer";

evalite.experimental_skip("Natural Language to SQL (Non Agent) Eval", {
  data: () => {
    return [
      {
        input: "How many games has Drow Ranger been played in ?",
        expected: "Mars has been played in <number> games.",
      } as const,
      {
        input: "How many games has Mars been played in ?",
        expected: "Mars has been played in <number> games.",
      } as const,
    ];
  },
  task: async (input) => {
    const chatId = generateId();
    const messages = [
      new HumanMessage({
        content: input,
      }),
    ];
    const result = query(chatId, messages);

    return result;
  },
  scorers: [ConstrainedFactuality],
});
