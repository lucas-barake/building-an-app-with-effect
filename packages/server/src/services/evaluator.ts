import * as AiLanguageModel from "@effect/ai/LanguageModel";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { AiExecPlan, AiLive } from "./ai-live.js";
import { SearchItem } from "./web-searcher.js";

const Result = Schema.Struct({
  satisfying: Schema.Array(Schema.UUID).annotations({
    description: "The candidates that satisfy the query.",
  }),
});

export class Evaluator extends Effect.Service<Evaluator>()("@org/Evaluator", {
  dependencies: [AiLive],
  effect: Effect.gen(function* () {
    const execPlan = yield* AiExecPlan.withRequirements;

    return {
      evaluate: Effect.fn("Evaluator.evaluate")(
        (query: string, potentialCandidates: ReadonlyArray<SearchItem>) =>
          AiLanguageModel.generateObject({
            prompt: makePrompt(query, potentialCandidates),
            schema: Result,
          }),
        Effect.withExecutionPlan(execPlan),
        Effect.map((result) => result.value.satisfying),
        Effect.orDie,
      ),
    } as const;
  }),
}) {}

const makePrompt = (
  query: string,
  potentialCandidates: ReadonlyArray<SearchItem>,
) => `You are a search relevance evaluator. Your task is to identify which search results are genuinely relevant to a user's query.

## User Query: "${query}"

## Instructions:
- Analyze each candidate's title, description, and markdown content
- Return the IDs of candidates that are meaningfully related to the user's query
- Be inclusive rather than overly restrictive - err on the side of including potentially relevant results
- Exclude results only if they are clearly unrelated or off-topic

## Relevance Criteria:
- **Include if**: The content addresses the user's topic, provides related information, or could help answer their question
- **Include if**: There's semantic overlap even if terminology differs (e.g., "car" and "automobile")
- **Exclude if**: The result is about a completely different topic that just happens to share some keywords
- **Exclude if**: It's clearly spam, irrelevant, or misleading content

## Decision Guidelines:
- When in doubt, include the result - it's better to have too many relevant results than to miss important ones
- Look for conceptual relevance, not just keyword matching
- Consider context and intent behind the user's query

## Candidates to Evaluate:
${potentialCandidates
  .map(
    (candidate, index) => `
**Candidate ${index + 1} (ID: ${candidate.id})**
- URL: ${candidate.url}
- Title: ${candidate.title}
- Description: ${candidate.description}
- Content Preview: ${candidate.markdown.slice(0, 500)}${candidate.markdown.length > 500 ? "..." : ""}
`,
  )
  .join("\n")}

Return only the IDs of candidates that are relevant to the user's query.`;
