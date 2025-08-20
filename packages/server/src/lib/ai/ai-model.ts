import { Data, Effect, type Schema, type Stream } from "effect";

export class AiError extends Data.TaggedError("AiError")<{
  readonly cause: unknown;
  readonly description: string;
  readonly method: string;
  readonly module: string;
}> {
  get message() {
    return `[${this.module}] ${this.method}: ${this.description}`;
  }
}

export declare namespace AiModel {
  export type Service = {
    readonly generateText: (options: {
      readonly prompt: string;
      readonly systemPrompt?: string;
    }) => Effect.Effect<string, AiError>;

    readonly streamText: <A, I, R = never>(options: {
      readonly prompt: string;
      readonly systemPrompt?: string;
      readonly schema?: Schema.Schema<A, I, R>;
    }) => Stream.Stream<string, AiError, R>;

    readonly generateObject: <A, I, R>(options: {
      readonly prompt: string;
      readonly systemPrompt?: string;
      readonly schema: Schema.Schema<A, I, R>;
    }) => Effect.Effect<A, AiError, R>;
  };
}

export class AiModel extends Effect.Tag("@org/AiModel")<AiModel, AiModel.Service>() {}
