import * as AnthropicClient from "@effect/ai-anthropic/AnthropicClient";
import * as AnthropicLanguageModel from "@effect/ai-anthropic/AnthropicLanguageModel";
import * as OpenAiClient from "@effect/ai-openai/OpenAiClient";
import * as OpenAiLanguageModel from "@effect/ai-openai/OpenAiLanguageModel";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as Config from "effect/Config";
import * as ExecutionPlan from "effect/ExecutionPlan";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";

const OpenAiLive = OpenAiClient.layerConfig({
  apiKey: Config.redacted("OPENAI_API_KEY"),
});

const AnthropicLive = AnthropicClient.layerConfig({
  apiKey: Config.redacted("ANTHROPIC_API_KEY"),
});

export const AiLive = Layer.mergeAll(
  OpenAiLive,
  AnthropicLive,
).pipe(Layer.provide(FetchHttpClient.layer));

export const AiExecPlan = ExecutionPlan.make(
  {
    provide: OpenAiLanguageModel.model("gpt-4o"),
    attempts: 2,
    schedule: Schedule.exponential("300 millis"),
  },
  {
    provide: AnthropicLanguageModel.model(
      "claude-sonnet-4-0",
    ),
    attempts: 2,
    schedule: Schedule.exponential("300 millis"),
  },
);
