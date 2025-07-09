import { evalite } from "evalite";
import { generateId } from "ai";
import { query } from "./sql-single-queries";
import { HumanMessage } from "@langchain/core/messages";
import { ConstrainedFactuality } from "./constrained-factuality-scorer";

evalite("Natural Language to SQL (Non Agent) Eval", {
  data: () => {
    return [
      {
        input: "How many games has Drow Ranger been played in ?",
        expected: "Drow Ranger has been played in 29 games.",
      } as const,
      {
        input: "How many games has Mars been played in ?",
        expected: "Mars has been played in 57 games.",
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
