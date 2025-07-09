import { generateObject } from "ai";
import { createScorer } from "evalite";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const ConstrainedFactuality = createScorer<string, string, string>({
  name: "ConstrainedFactuality",
  scorer: ({ input, expected, output }) => {
    return checkConstrainedFactuality({
      question: input,
      desiredAnswer: expected!,
      submission: output,
    });
  },
});

async function checkConstrainedFactuality(opts: {
  question: string;
  desiredAnswer: string;
  submission: string;
}) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    prompt: `
      You are comparing a submitted answer to an desired answer on a given question. Here is the data:
      [BEGIN DATA]
      ************
      [Question]: ${opts.question}
      ************
      [Desired Answer]: ${opts.desiredAnswer}
      ************
      [Submission]: ${opts.submission}
      ************
      [END DATA]

      Compare the factual content of the submitted answer with the desired answer. Ignore any differences in style, grammar, or punctuation. Compare the parameters defined within the tags < >. These could include oarameters such as <number> or <string> or even more specific values such as <positive_number>. When comparing to the submitted answer, check if the parameters match that of the desired answer. For example, if the desired answer is: I have <positive_number> apples, and the submission is: I have 10 apples, check the factuality of 10 against <positive_number>. You're expected to do this substitution when checking for factuality, and thus having a specific value doesn't make is a superset or subset of the desired answer, the desired answer is expected to have substituted values. 
      The submitted answer may either be a subset or superset of the desired answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
      (A) The submitted answer is a subset of the desired answer and is fully consistent with it.
      (B) The submitted answer is a superset of the desired answer and is fully consistent with it.
      (C) The submitted answer contains all the same details as the desired answer.
      (D) There is a disagreement between the submitted answer and the desired answer.
      (E) The answers differ, but these differences don't matter from the perspective of factuality.
    `,
    schema: z.object({
      answer: z.enum(["A", "B", "C", "D", "E"]).describe("Your selection."),
      rationale: z
        .string()
        .describe("Why you chose this answer. Be very detailed."),
    }),
  });

  const scores = {
    A: 0.4,
    B: 0.6,
    C: 1,
    D: 0,
    E: 1,
  };
  return {
    score: scores[object.answer],
    metadata: {
      rationale: object.rationale,
    },
  };
}
