import { generateObject } from "ai";
import { createScorer } from "evalite";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Define formal grammar for tagged parameters
interface ParameterConstraint {
  type: string;
  validate: (value: any) => boolean;
  extract: (text: string) => any;
}

const PARAMETER_GRAMMAR: Record<string, ParameterConstraint> = {
  positive_number: {
    type: "positive_number",
    validate: (n: number) => Number.isInteger(n) && n > 0,
    extract: (text: string) => {
      const matches = text.match(/\b\d+\b/g);
      return matches ? matches.map(Number) : [];
    }
  },
  negative_number: {
    type: "negative_number",
    validate: (n: number) => Number.isInteger(n) && n < 0,
    extract: (text: string) => {
      const matches = text.match(/-\d+\b/g);
      return matches ? matches.map(Number) : [];
    }
  },
  number: {
    type: "number",
    validate: (n: number) => typeof n === 'number' && !isNaN(n),
    extract: (text: string) => {
      const matches = text.match(/-?\d+(?:\.\d+)?/g);
      return matches ? matches.map(Number) : [];
    }
  },
  string: {
    type: "string",
    validate: (s: string) => typeof s === 'string' && s.length > 0,
    extract: (text: string) => {
      // Extract quoted strings or significant word sequences
      const quoted = text.match(/"([^"]+)"/g) || text.match(/'([^']+)'/g);
      if (quoted) return quoted.map(q => q.slice(1, -1));

      // Fallback to extracting meaningful word sequences
      const words = text.match(/\b[a-zA-Z]+(?:\s+[a-zA-Z]+)*\b/g);
      return words || [];
    }
  },
  email: {
    type: "email",
    validate: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    extract: (text: string) => {
      const matches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
      return matches || [];
    }
  },
  date: {
    type: "date",
    validate: (date: string) => !isNaN(Date.parse(date)),
    extract: (text: string) => {
      // Match various date formats
      const patterns = [
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
        /\b\d{4}-\d{2}-\d{2}\b/g,
        /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi
      ];

      const matches: string[] = [];
      patterns.forEach(pattern => {
        const found = text.match(pattern);
        if (found) matches.push(...found);
      });

      return matches;
    }
  }
};

// Parse template to extract parameter constraints
interface ParsedTemplate {
  constraints: Array<{
    tag: string;
    type: string;
    position: number;
  }>;
  template: string;
}

function parseTemplate(template: string): ParsedTemplate {
  const constraints: ParsedTemplate['constraints'] = [];
  const tagRegex = /<(\w+)>/g;
  let match;

  while ((match = tagRegex.exec(template)) !== null) {
    const [fullMatch, tagType] = match;
    constraints.push({
      tag: fullMatch,
      type: tagType,
      position: match.index
    });
  }

  return {
    constraints,
    template
  };
}

// Extract and validate values from submission against constraints
interface ValidationResult {
  constraint: ParsedTemplate['constraints'][0];
  extractedValues: any[];
  validValues: any[];
  isValid: boolean;
}

function validateSubmission(
  submission: string,
  constraints: ParsedTemplate['constraints']
): ValidationResult[] {
  return constraints.map(constraint => {
    const parameterDef = PARAMETER_GRAMMAR[constraint.type];

    if (!parameterDef) {
      return {
        constraint,
        extractedValues: [],
        validValues: [],
        isValid: false
      };
    }

    const extractedValues = parameterDef.extract(submission);
    const validValues = extractedValues.filter(parameterDef.validate);

    return {
      constraint,
      extractedValues,
      validValues,
      isValid: validValues.length > 0
    };
  });
}

// Compare constraint satisfaction between desired and submission
type ComparisonResult = 'subset' | 'superset' | 'identical' | 'conflict' | 'no_difference';

function compareConstraints(
  desiredConstraints: ParsedTemplate['constraints'],
  submissionValidation: ValidationResult[]
): ComparisonResult {
  // Check if all desired constraints are satisfied
  const allConstraintsSatisfied = desiredConstraints.every(desired => {
    const validation = submissionValidation.find(v => v.constraint.type === desired.type);
    return validation && validation.isValid;
  });

  if (!allConstraintsSatisfied) {
    return 'conflict';
  }

  // Check for additional constraints or values in submission
  const hasAdditionalContent = submissionValidation.some(validation => {
    const hasCorrespondingDesired = desiredConstraints.some(d => d.type === validation.constraint.type);
    return validation.validValues.length > 1 || !hasCorrespondingDesired;
  });

  if (hasAdditionalContent) {
    return 'superset';
  }

  // Check if submission exactly matches constraints
  const exactMatch = desiredConstraints.length === submissionValidation.length &&
    submissionValidation.every(v => v.validValues.length === 1);

  return exactMatch ? 'identical' : 'subset';
}

// Enhanced constrained factuality checker
export const EnhancedConstrainedFactuality = createScorer<string, string, string>({
  name: "EnhancedConstrainedFactuality",
  scorer: ({ input, expected, output }) => {
    return checkEnhancedConstrainedFactuality({
      question: input,
      desiredAnswer: expected!,
      submission: output,
    });
  },
});

async function checkEnhancedConstrainedFactuality(opts: {
  question: string;
  desiredAnswer: string;
  submission: string;
}) {
  // Step 1: Parse desired answer for constraints
  const parsedDesired = parseTemplate(opts.desiredAnswer);

  // Step 2: If no constraints found, fall back to LLM comparison
  if (parsedDesired.constraints.length === 0) {
    return fallbackLLMComparison(opts);
  }

  // Step 3: Validate submission against constraints
  const validationResults = validateSubmission(opts.submission, parsedDesired.constraints);

  // Step 4: Compare constraint satisfaction
  const comparisonResult = compareConstraints(parsedDesired.constraints, validationResults);

  // Step 5: Map to scoring categories
  const mapping: Record<ComparisonResult, { score: number; category: 'A' | 'B' | 'C' | 'D' | 'E' }> = {
    subset: { score: 0.4, category: 'A' },
    superset: { score: 0.6, category: 'B' },
    identical: { score: 1.0, category: 'C' },
    conflict: { score: 0, category: 'D' },
    no_difference: { score: 1.0, category: 'E' }
  };

  const result = mapping[comparisonResult];

  // Generate detailed rationale
  const rationale = generateRationale(
    parsedDesired,
    validationResults,
    comparisonResult,
    opts
  );

  return {
    score: result.score,
    metadata: {
      rationale,
      constraintAnalysis: {
        desiredConstraints: parsedDesired.constraints,
        validationResults,
        comparisonResult
      }
    },
  };
}

function generateRationale(
  parsedDesired: ParsedTemplate,
  validationResults: ValidationResult[],
  comparisonResult: ComparisonResult,
  opts: { question: string; desiredAnswer: string; submission: string; }
): string {
  let rationale = `Formal constraint analysis:\n\n`;

  rationale += `Desired answer constraints found: ${parsedDesired.constraints.map(c => `<${c.type}>`).join(', ')}\n\n`;

  validationResults.forEach(result => {
    rationale += `Constraint <${result.constraint.type}>:\n`;
    rationale += `  - Extracted values: [${result.extractedValues.join(', ')}]\n`;
    rationale += `  - Valid values: [${result.validValues.join(', ')}]\n`;
    rationale += `  - Satisfied: ${result.isValid ? 'Yes' : 'No'}\n\n`;
  });

  rationale += `Overall comparison result: ${comparisonResult}\n\n`;

  switch (comparisonResult) {
    case 'subset':
      rationale += 'The submission satisfies all required constraints but provides minimal information.';
      break;
    case 'superset':
      rationale += 'The submission satisfies all required constraints and provides additional valid information.';
      break;
    case 'identical':
      rationale += 'The submission exactly matches the constraint requirements.';
      break;
    case 'conflict':
      rationale += 'The submission violates one or more required constraints.';
      break;
    case 'no_difference':
      rationale += 'Any differences between the answers do not affect factual accuracy.';
      break;
  }

  return rationale;
}

// Fallback to original LLM-based comparison when no constraints are detected
async function fallbackLLMComparison(opts: {
  question: string;
  desiredAnswer: string;
  submission: string;
}) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    prompt: `
      You are comparing a submitted answer to a desired answer on a given question. Here is the data:
      [BEGIN DATA]
      ************
      [Question]: ${opts.question}
      ************
      [Desired Answer]: ${opts.desiredAnswer}
      ************
      [Submission]: ${opts.submission}
      ************
      [END DATA]

      Compare the factual content of the submitted answer with the desired answer. Ignore any differences in style, grammar, or punctuation.
      
      The submitted answer may either be a subset or superset of the desired answer, or it may conflict with it. Determine which case applies:
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
      rationale: `${object.rationale}\n\n[Note: No formal constraints detected, used LLM fallback comparison]`
    },
  };
}

// Export both scorers for flexibility
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

// Original implementation for comparison
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

      Compare the factual content of the submitted answer with the desired answer. Ignore any differences in style, grammar, or punctuation. Compare the parameters defined within the tags < >. These could include parameters such as <number> or <string> or even more specific values such as <positive_number>. When comparing to the submitted answer, check if the parameters match that of the desired answer. For example, if the desired answer is: I have <positive_number> apples, and the submission is: I have 10 apples, check the factuality of 10 against <positive_number>. You're expected to do this substitution when checking for factuality, and thus having a specific value doesn't make is a superset or subset of the desired answer, the desired answer is expected to have substituted values. 
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