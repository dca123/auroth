import { OpenAIEmbeddings } from "@langchain/openai";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { Document } from "@langchain/core/documents";
import { SqlDatabase } from "langchain/sql_db";
import { DataSource } from "typeorm";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { spawnSync } from "child_process";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

// --- Enhanced Parameter Grammar for DOTA Context ---
interface ParameterConstraint {
  type: string;
  validate: (value: any) => boolean;
  extract: (text: string) => any[];
  description: string;
}

const DOTA_PARAMETER_GRAMMAR: Record<string, ParameterConstraint> = {
  positive_number: {
    type: "positive_number",
    validate: (n: number) => Number.isInteger(n) && n > 0,
    extract: (text: string) => {
      const matches = text.match(/\b\d+\b/g);
      return matches ? matches.map(Number).filter(n => n > 0) : [];
    },
    description: "Integer greater than 0"
  },
  negative_number: {
    type: "negative_number",
    validate: (n: number) => Number.isInteger(n) && n < 0,
    extract: (text: string) => {
      const matches = text.match(/-\d+\b/g);
      return matches ? matches.map(Number) : [];
    },
    description: "Integer less than 0"
  },
  number: {
    type: "number",
    validate: (n: number) => typeof n === 'number' && !isNaN(n),
    extract: (text: string) => {
      const matches = text.match(/-?\d+(?:\.\d+)?/g);
      return matches ? matches.map(Number) : [];
    },
    description: "Any valid number"
  },
  hero_name: {
    type: "hero_name",
    validate: (name: string) => typeof name === 'string' && name.length > 0,
    extract: (text: string) => {
      // Extract capitalized words that could be hero names
      const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
      return matches || [];
    },
    description: "DOTA hero name"
  },
  item_name: {
    type: "item_name",
    validate: (name: string) => typeof name === 'string' && name.length > 0,
    extract: (text: string) => {
      // Extract potential item names (often contain special characters or multiple words)
      const matches = text.match(/\b[A-Za-z][A-Za-z\s'-]+\b/g);
      return matches ? matches.filter(m => m.length > 2) : [];
    },
    description: "DOTA item name"
  },
  player_name: {
    type: "player_name",
    validate: (name: string) => typeof name === 'string' && name.length > 0,
    extract: (text: string) => {
      // Extract player names (often nicknames or handles)
      const matches = text.match(/\b[A-Za-z0-9_-]+\b/g);
      return matches ? matches.filter(m => m.length > 1) : [];
    },
    description: "DOTA player name"
  },
  team_name: {
    type: "team_name",
    validate: (name: string) => typeof name === 'string' && name.length > 0,
    extract: (text: string) => {
      // Extract team names (often multi-word with special characters)
      const matches = text.match(/\b[A-Za-z][A-Za-z\s.]+\b/g);
      return matches ? matches.filter(m => m.length > 2) : [];
    },
    description: "DOTA team name"
  },
  string: {
    type: "string",
    validate: (s: string) => typeof s === 'string' && s.length > 0,
    extract: (text: string) => {
      const quoted = text.match(/"([^"]+)"/g) || text.match(/'([^']+)'/g);
      if (quoted) return quoted.map(q => q.slice(1, -1));

      const words = text.match(/\b[a-zA-Z]+(?:\s+[a-zA-Z]+)*\b/g);
      return words || [];
    },
    description: "Any non-empty string"
  },
  percentage: {
    type: "percentage",
    validate: (n: number) => typeof n === 'number' && n >= 0 && n <= 100,
    extract: (text: string) => {
      const matches = text.match(/\b(\d+(?:\.\d+)?)%\b/g);
      return matches ? matches.map(m => parseFloat(m.replace('%', ''))) : [];
    },
    description: "Percentage value between 0 and 100"
  },
  duration: {
    type: "duration",
    validate: (d: string) => /^\d+(?:\.\d+)?\s*(?:s|sec|seconds?|m|min|minutes?|h|hr|hours?)$/i.test(d),
    extract: (text: string) => {
      const matches = text.match(/\b\d+(?:\.\d+)?\s*(?:s|sec|seconds?|m|min|minutes?|h|hr|hours?)\b/gi);
      return matches || [];
    },
    description: "Time duration (e.g., '30s', '2 minutes')"
  }
};

// --- Enhanced Template Parsing ---
interface ParsedTemplate {
  constraints: Array<{
    tag: string;
    type: string;
    position: number;
    context?: string;
  }>;
  template: string;
}

function parseTemplate(template: string): ParsedTemplate {
  const constraints: ParsedTemplate['constraints'] = [];
  const tagRegex = /<(\w+)>/g;
  let match;

  while ((match = tagRegex.exec(template)) !== null) {
    const [fullMatch, tagType] = match;
    const startPos = Math.max(0, match.index - 20);
    const endPos = Math.min(template.length, match.index + fullMatch.length + 20);
    const context = template.slice(startPos, endPos);

    constraints.push({
      tag: fullMatch,
      type: tagType,
      position: match.index,
      context
    });
  }

  return {
    constraints,
    template
  };
}

// --- Enhanced Validation with DOTA Context ---
interface ValidationResult {
  constraint: ParsedTemplate['constraints'][0];
  extractedValues: any[];
  validValues: any[];
  isValid: boolean;
  confidence: number;
}

async function validateSubmissionWithContext(
  submission: string,
  constraints: ParsedTemplate['constraints'],
  context: {
    retrievedEntities?: any[];
    namedEntities?: Array<{ entity: string; type: string }>;
  } = {}
): Promise<ValidationResult[]> {
  return Promise.all(constraints.map(async constraint => {
    const parameterDef = DOTA_PARAMETER_GRAMMAR[constraint.type];

    if (!parameterDef) {
      return {
        constraint,
        extractedValues: [],
        validValues: [],
        isValid: false,
        confidence: 0
      };
    }

    let extractedValues = parameterDef.extract(submission);
    let confidence = 0.5;

    // Enhanced validation for DOTA-specific types
    if (['hero_name', 'item_name', 'player_name', 'team_name'].includes(constraint.type)) {
      // Use retrieved entities for better matching
      if (context.retrievedEntities) {
        const relevantEntities = context.retrievedEntities
          .filter(entity => entity.metadata.table.includes(constraint.type.replace('_name', '')))
          .map(entity => entity.pageContent);

        // Check if extracted values match known entities
        extractedValues = extractedValues.filter(value =>
          relevantEntities.some(entity =>
            entity.toLowerCase().includes(value.toLowerCase()) ||
            value.toLowerCase().includes(entity.toLowerCase())
          )
        );

        if (extractedValues.length > 0) confidence = 0.9;
      }

      // Cross-reference with named entities
      if (context.namedEntities) {
        const matchingNER = context.namedEntities.filter(ne =>
          extractedValues.some(ev =>
            ne.entity.toLowerCase().includes(ev.toLowerCase()) ||
            ev.toLowerCase().includes(ne.entity.toLowerCase())
          )
        );

        if (matchingNER.length > 0) confidence = Math.max(confidence, 0.8);
      }
    }

    const validValues = extractedValues.filter(parameterDef.validate);

    return {
      constraint,
      extractedValues,
      validValues,
      isValid: validValues.length > 0,
      confidence
    };
  }));
}

// --- Enhanced Comparison Logic ---
type ComparisonResult = 'subset' | 'superset' | 'identical' | 'conflict' | 'no_difference';

function compareConstraintsWithConfidence(
  desiredConstraints: ParsedTemplate['constraints'],
  submissionValidation: ValidationResult[]
): { result: ComparisonResult; confidence: number; details: string } {
  const avgConfidence = submissionValidation.reduce((sum, v) => sum + v.confidence, 0) / submissionValidation.length || 0;

  // Check if all desired constraints are satisfied
  const satisfiedConstraints = desiredConstraints.filter(desired => {
    const validation = submissionValidation.find(v => v.constraint.type === desired.type);
    return validation && validation.isValid;
  });

  if (satisfiedConstraints.length < desiredConstraints.length) {
    const unsatisfied = desiredConstraints.filter(d =>
      !submissionValidation.find(v => v.constraint.type === d.type && v.isValid)
    );
    return {
      result: 'conflict',
      confidence: avgConfidence,
      details: `Unsatisfied constraints: ${unsatisfied.map(u => u.type).join(', ')}`
    };
  }

  // Check for additional validated content
  const hasAdditionalContent = submissionValidation.some(validation => {
    const hasCorrespondingDesired = desiredConstraints.some(d => d.type === validation.constraint.type);
    return validation.validValues.length > 1 || (!hasCorrespondingDesired && validation.isValid);
  });

  if (hasAdditionalContent) {
    return {
      result: 'superset',
      confidence: avgConfidence,
      details: 'Submission contains additional valid information beyond required constraints'
    };
  }

  // Check for exact match
  const exactMatch = desiredConstraints.length === submissionValidation.filter(v => v.isValid).length &&
    submissionValidation.every(v => v.validValues.length === 1);

  if (exactMatch) {
    return {
      result: 'identical',
      confidence: avgConfidence,
      details: 'Submission exactly matches all constraint requirements'
    };
  }

  return {
    result: 'subset',
    confidence: avgConfidence,
    details: 'Submission satisfies required constraints with minimal additional information'
  };
}

// --- Database & Retriever Setup ---
const datasource = new DataSource({
  type: "sqlite",
  database: "dota.db",
});
await datasource.initialize();
const db = await SqlDatabase.fromDataSourceParams({
  appDataSource: datasource,
});

async function queryAsList(
  database: SqlDatabase,
  query: string,
): Promise<string[]> {
  const rowsJson = await database.run(query);
  const rows = JSON.parse(rowsJson)
    .flat()
    .filter((item: any) => item != null);
  return rows
    .map((row: Record<string, string>) =>
      Object.values(row)[0]
        .replace(/\b\d+\b/g, "")
        .trim(),
    )
    .filter((value) => value !== "");
}

function convertToDocument(opts: {
  pageContent: string;
  metadata: { table: string; columnName: string };
}) {
  return new Document(opts);
}

async function properNounsDocuments() {
  const heroes = await queryAsList(db, "SELECT display_name FROM heroes");
  const items = await queryAsList(db, "SELECT display_name FROM items");
  const players = await queryAsList(db, "SELECT name FROM team_players");
  const teams = await queryAsList(db, "SELECT name FROM teams");
  return [
    ...heroes.map((name) => convertToDocument({
      pageContent: name,
      metadata: { table: "heroes", columnName: "display_name" }
    })),
    ...items.map((name) => convertToDocument({
      pageContent: name,
      metadata: { table: "items", columnName: "display_name" }
    })),
    ...players.map((name) => convertToDocument({
      pageContent: name,
      metadata: { table: "team_players", columnName: "name" }
    })),
    ...teams.map((name) => convertToDocument({
      pageContent: name,
      metadata: { table: "teams", columnName: "name" }
    })),
  ];
}

// Embedding-based retriever for proper nouns
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-large" });
const vectorStore = new MemoryVectorStore(embeddings);

try {
  const docs = await properNounsDocuments();
  await vectorStore.addDocuments(docs);
} catch (e) {
  console.error("error adding documents to vector store:", e);
}

const retriever = vectorStore.asRetriever(5);

// --- Enhanced Tools with Formal Grammar Integration ---
export const searchProperNouns = tool(
  async ({ query }) => {
    const results = await retriever.getRelevantDocuments(query);
    return results
      .map(
        (doc, idx) =>
          `Result ${idx + 1}:\nContent: ${doc.pageContent}\nMetadata: ${JSON.stringify(doc.metadata)}`,
      )
      .join("\n\n");
  },
  {
    name: "searchProperNouns",
    description:
      "lookup approximate spellings of heroes, items, players, or teams and return the best matches.",
    schema: z.object({ query: z.string().describe("fuzzy proper noun") }),
  },
);

// --- Named Entity Recognition Tool (using NLTK via Python) ---
export const extractNamedEntities = tool(
  ({ text }) => {
    const py = spawnSync("python3", ["./ner.py"], { input: text, encoding: "utf-8" });
    if (py.error) throw py.error;
    const raw = py.stdout.trim();
    try {
      return JSON.parse(raw) as Array<{ entity: string; type: string }>;
    } catch (err) {
      throw new Error(`failed to parse NER output: ${raw}`);
    }
  },
  {
    name: "extractNamedEntities",
    description: "extract named entities from text using NLTK, returning [{entity,type}].",
    schema: z.object({ text: z.string().describe("input text for NER") }),
  },
);

// --- Enhanced Constraint Validation Tool ---
export const validateDotaConstraints = tool(
  async ({ desiredAnswer, submission, useContext = true }) => {
    // Parse constraints from desired answer
    const parsedDesired = parseTemplate(desiredAnswer);

    if (parsedDesired.constraints.length === 0) {
      return {
        hasConstraints: false,
        message: "No formal constraints detected in desired answer"
      };
    }

    let context: any = {};

    if (useContext) {
      // Gather contextual information
      const entityPromises = parsedDesired.constraints
        .filter(c => ['hero_name', 'item_name', 'player_name', 'team_name'].includes(c.type))
        .map(async c => {
          const searchQuery = c.context?.replace(/<\w+>/g, '').trim() || submission;
          return await retriever.getRelevantDocuments(searchQuery);
        });

      const retrievedEntities = (await Promise.all(entityPromises)).flat();

      // Extract named entities
      try {
        const namedEntities = extractNamedEntities.func({ text: submission });
        context = { retrievedEntities, namedEntities };
      } catch (e) {
        context = { retrievedEntities };
      }
    }

    // Validate submission against constraints
    const validationResults = await validateSubmissionWithContext(
      submission,
      parsedDesired.constraints,
      context
    );

    // Compare constraints
    const comparisonResult = compareConstraintsWithConfidence(
      parsedDesired.constraints,
      validationResults
    );

    return {
      hasConstraints: true,
      constraints: parsedDesired.constraints.map(c => ({
        type: c.type,
        description: DOTA_PARAMETER_GRAMMAR[c.type]?.description || 'Unknown constraint'
      })),
      validationResults: validationResults.map(vr => ({
        constraintType: vr.constraint.type,
        extractedValues: vr.extractedValues,
        validValues: vr.validValues,
        isValid: vr.isValid,
        confidence: vr.confidence
      })),
      comparisonResult: comparisonResult.result,
      confidence: comparisonResult.confidence,
      details: comparisonResult.details,
      score: getScoreFromComparison(comparisonResult.result)
    };
  },
  {
    name: "validateDotaConstraints",
    description: "Validate DOTA-related answers against formal parameter constraints with context awareness",
    schema: z.object({
      desiredAnswer: z.string().describe("Template answer with parameter constraints"),
      submission: z.string().describe("Actual submission to validate"),
      useContext: z.boolean().optional().describe("Whether to use retrieval and NER context")
    }),
  },
);

function getScoreFromComparison(result: ComparisonResult): number {
  const scores = {
    subset: 0.4,
    superset: 0.6,
    identical: 1.0,
    conflict: 0,
    no_difference: 1.0
  };
  return scores[result];
}

// --- Enhanced DOTA Query Validator ---
export const dotaQueryValidator = tool(
  async ({ question, desiredAnswer, submission }) => {
    // First, try formal constraint validation
    const constraintValidation = await validateDotaConstraints.func({
      desiredAnswer,
      submission,
      useContext: true
    });

    if (constraintValidation.hasConstraints) {
      return {
        method: 'formal_grammar',
        score: constraintValidation.score,
        result: constraintValidation.comparisonResult,
        confidence: constraintValidation.confidence,
        details: constraintValidation.details,
        constraintAnalysis: constraintValidation
      };
    }

    // Fallback to LLM-based comparison for unconstrained queries
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      prompt: `
        You are comparing a DOTA 2 related submitted answer to a desired answer. Here is the data:
        [BEGIN DATA]
        ************
        [Question]: ${question}
        ************
        [Desired Answer]: ${desiredAnswer}
        ************
        [Submission]: ${submission}
        ************
        [END DATA]

        Compare the factual content focusing on DOTA 2 specific information (heroes, items, players, teams, game mechanics).
        Ignore differences in style, grammar, or punctuation.
        
        Determine which case applies:
        (A) The submitted answer is a subset of the desired answer and is fully consistent with it.
        (B) The submitted answer is a superset of the desired answer and is fully consistent with it.
        (C) The submitted answer contains all the same details as the desired answer.
        (D) There is a disagreement between the submitted answer and the desired answer.
        (E) The answers differ, but these differences don't matter from the perspective of factuality.
      `,
      schema: z.object({
        answer: z.enum(["A", "B", "C", "D", "E"]).describe("Your selection."),
        rationale: z.string().describe("Why you chose this answer. Be very detailed."),
        dotaSpecificAnalysis: z.string().describe("Analysis of DOTA-specific content accuracy")
      }),
    });

    const scores = { A: 0.4, B: 0.6, C: 1, D: 0, E: 1 };

    return {
      method: 'llm_fallback',
      score: scores[object.answer],
      result: object.answer,
      confidence: 0.7, // Lower confidence for LLM-based decisions
      details: object.rationale,
      dotaAnalysis: object.dotaSpecificAnalysis
    };
  },
  {
    name: "dotaQueryValidator",
    description: "Comprehensive DOTA query validation using formal grammar when possible, LLM fallback otherwise",
    schema: z.object({
      question: z.string().describe("Original question"),
      desiredAnswer: z.string().describe("Expected answer template"),
      submission: z.string().describe("Actual submission to validate")
    }),
  },
);

// --- Export enhanced system ---
export {
  DOTA_PARAMETER_GRAMMAR,
  parseTemplate,
  validateSubmissionWithContext,
  compareConstraintsWithConfidence
};