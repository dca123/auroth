import { evalite } from "evalite";
import { generateId } from "ai";
import { Factuality } from "autoevals";
import { query } from "./sql-agent-ai";
import { HumanMessage } from "@langchain/core/messages";
import { ConstrainedFactuality } from "./constrained-factuality-scorer";

evalite("Natural Language to SQL (Agent) Eval", {
  data: async () => {
    return [
      //{
      //  input: "How many games has Mars been played in ?",
      //  expected: "<number> games",
      //},
      {
        input: "How many games has saberlight played in ?",
        expected: "SabeRLighT has played in <number> games",
      },
    ];
  },
  task: (input) => {
    const chatId = generateId();
    const messages = [
      new HumanMessage({
        content: input,
      }),
    ];
    const result = query(chatId, messages);

    return result;
  },
  scorers: [Factuality],
});
