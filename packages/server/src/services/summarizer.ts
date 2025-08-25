import * as AiLanguageModel from "@effect/ai/AiLanguageModel";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { AiExecPlan, AiLive } from "./ai-live.js";

export class Summarizer extends Effect.Service<Summarizer>()("@org/Summarizer", {
  dependencies: [AiLive],
  effect: Effect.gen(function* () {
    const execPlan = yield* AiExecPlan.withRequirements;

    return {
      summarize: (query: string, markdownContents: ReadonlyArray<string>) =>
        AiLanguageModel.streamText({
          prompt: makePrompt(query, markdownContents),
        }).pipe(
          Stream.withExecutionPlan(execPlan),
          Stream.map((response) => response.text),
          Stream.orDie,
        ),
    } as const;
  }),
}) {}

const makePrompt = (query: string, markdownContents: ReadonlyArray<string>) => `
You are an AI research assistant that creates comprehensive summaries from multiple web sources.

## User Query: "${query}"

## Instructions:
- Synthesize information from all provided sources into a cohesive, informative summary
- Focus on directly answering the user's query while providing relevant context
- Organize information logically and highlight key insights
- If sources contradict each other, acknowledge different perspectives
- Be comprehensive but concise - aim for a summary that saves the user from reading all sources
- Include specific details, examples, and actionable information when available
- Maintain accuracy and avoid hallucinating information not present in the sources

## Writing Style:
- Clear, professional, and engaging
- Use bullet points or sections when it improves readability
- Lead with the most relevant information to the user's query
- End with key takeaways or next steps if applicable

## Source Materials:
${markdownContents
  .map(
    (content, index) => `
### Source ${index + 1}:
${content}

---
`,
  )
  .join("\n")}

Create a comprehensive summary that directly addresses the user's query: "${query}"`;
