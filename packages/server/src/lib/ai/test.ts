import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer, Redacted, Schema, Stream } from "effect";
import { OpenAiModel, OpenAiProvider } from "./index.js";

const OpenAiLive = OpenAiProvider.layer({
  apiKey: Redacted.make(process.env.OPENAI_API_KEY!),
}).pipe(Layer.provide(FetchHttpClient.layer));

class Todo extends Schema.Class<Todo>("Todo")({
  id: Schema.String,
  title: Schema.String,
  completed: Schema.Boolean,
}) {}

const main = Effect.gen(function* () {
  const model = yield* OpenAiModel.model("gpt-4o-mini");

  const text = yield* model.generateText({
    prompt: "What is the capital of France?",
    systemPrompt: "You are a helpful assistant that can answer questions about the world.",
  });
  console.log({ text });

  const todo = yield* model.generateObject({
    prompt: "Create a random todo item",
    schema: Todo,
  });
  console.log({ todo });

  console.log("\nStream:");
  yield* model
    .streamText({
      prompt: "Write a poem about the color blue",
      systemPrompt: "You are a poet that writes poems about the color blue.",
    })
    .pipe(
      Stream.tap((chunk) => Effect.sync(() => process.stdout.write(chunk))),
      Stream.runDrain,
    );
});

void main.pipe(Effect.provide(OpenAiLive), Effect.runPromise);
