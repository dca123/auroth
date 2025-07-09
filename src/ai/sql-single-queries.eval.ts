import { evalite } from "evalite";
import { generateId } from "ai";
import { queryAgent } from "./sql-single-queries";
import { HumanMessage } from "@langchain/core/messages";
import { ConstrainedFactuality } from "./constrained-factuality-scorer";

evalite("Natural Language to SQL agent Eval", {
  data: () => {
    return [
      {
        input: "How many games has Drow Ranger been played in ?",
        expected: "Drow Ranger has been played in 29 games.",
      } as const,
      {
        input: "What is the win rate of saberlight ?",
        expected: "Win rate of SaberLight is 50%.",
      } as const,
      {
        input: "How has the win rate of axe changed over the last tournament ?",
        expected: "Win rate of SaberLight is 50%.",
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
    const result = await queryAgent(messages);
    const answer = result.messages.at(-1)?.content.toString();
    return answer;
  },
  scorers: [ConstrainedFactuality],
});
