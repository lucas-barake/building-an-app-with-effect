import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as JSONSchema from "effect/JSONSchema";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as AiModel from "./ai-model.js";
import { OpenAiClient } from "./open-ai-client.js";

// ================================
// Json Schema
// ================================

const makeJsonSchema = <A, I, R>(schema: Schema.Schema<A, I, R>): JSONSchema.JsonSchema7 =>
  JSONSchema.fromAST(schema.ast, {
    definitions: {},
    target: "jsonSchema7",
    topLevelReferenceStrategy: "skip",
  });

// ================================
// Schemas
// ================================

const OutputItem = Schema.Union(
  Schema.Struct({
    id: Schema.optional(Schema.String),
    type: Schema.Literal("message"),
    role: Schema.optional(Schema.Literal("assistant")),
    content: Schema.Array(
      Schema.Struct({
        type: Schema.Literal("output_text"),
        text: Schema.String,
      }),
    ),
  }),
  Schema.Struct({
    id: Schema.optional(Schema.String),
    type: Schema.Literal("reasoning"),
    status: Schema.optional(Schema.Literal("completed", "in_progress")),
    summary: Schema.optional(
      Schema.Array(
        Schema.Struct({
          type: Schema.Literal("reasoning_text"),
          text: Schema.String,
        }),
      ),
    ),
  }),
);

class Completion extends Schema.Class<Completion>("Completion")({
  object: Schema.Literal("response"),
  output: Schema.Array(OutputItem),
}) {}

class StreamEvent extends Schema.Class<StreamEvent>("StreamEvent")({
  type: Schema.String,
  delta: Schema.optional(Schema.String),
  response: Schema.optional(
    Schema.Struct({
      object: Schema.Literal("response"),
      status: Schema.Literal("in_progress", "completed", "failed", "incomplete"),
      output: Schema.optional(Schema.Array(OutputItem)),
    }),
  ),
}) {}

// ================================
// Implementation
// ================================

export type Model = "gpt-5" | "gpt-4o" | "gpt-4o-mini";

export const make = Effect.fnUntraced(function* (makeOptions: { readonly model: Model }) {
  const config = yield* OpenAiClient;

  const completionToMessage = (completion: Completion): string =>
    Arr.findFirst(completion.output, (item) => item.type === "message").pipe(
      Option.flatMap((item) => Arr.head(item.content)),
      Option.map((item) => item.text),
      Option.getOrElse(() => ""),
    );

  return AiModel.AiModel.of({
    generateText: Effect.fn("OpenAiModel.generateText")((options) =>
      config.httpClient
        .post("/v1/responses", {
          body: HttpBody.unsafeJson({
            model: makeOptions.model,
            input: [
              ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
              { role: "user", content: options.prompt },
            ],
          }),
        })
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Completion)),
          Effect.map(completionToMessage),
          Effect.mapError(
            (error) =>
              new AiModel.AiError({
                description: error.message,
                method: "generateText",
                module: "OpenAiModel",
                cause: error,
              }),
          ),
        ),
    ),

    generateObject: Effect.fn("OpenAiModel.generateObject")((options) =>
      config.httpClient
        .post("/v1/responses", {
          body: HttpBody.unsafeJson({
            model: makeOptions.model,
            input: [
              ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
              { role: "user", content: options.prompt },
            ],
            text: {
              format: {
                type: "json_schema",
                name: "result",
                schema: makeJsonSchema(options.schema),
              },
            },
          }),
        })
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Completion)),
          Effect.map(completionToMessage),
          Effect.flatMap(Schema.decode(Schema.parseJson(options.schema))),
          Effect.mapError(
            (error) =>
              new AiModel.AiError({
                description: error.message,
                method: "generateObject",
                module: "OpenAiModel",
                cause: error,
              }),
          ),
        ),
    ),

    streamText: (options) =>
      config.httpClient
        .post("/v1/responses", {
          body: HttpBody.unsafeJson({
            model: makeOptions.model,
            stream: true,
            input: [
              ...(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []),
              { role: "user", content: options.prompt },
            ],
            ...(options.schema && {
              text: {
                format: {
                  type: "json_schema",
                  name: "result",
                  schema: makeJsonSchema(options.schema),
                },
              },
            }),
          }),
        })
        .pipe(
          HttpClientResponse.stream,
          Stream.decodeText("utf-8"),
          Stream.splitLines,
          Stream.filter((line) => line.startsWith("data:")),
          Stream.filter((line) => line !== "data: [DONE]"),
          Stream.map((line) => line.slice(5)),
          Stream.mapEffect(Schema.decode(Schema.parseJson(StreamEvent))),
          Stream.filter((event) => event.type === "response.output_text.delta"),
          Stream.map((event) => event.delta ?? ""),
          Stream.mapError(
            (error) =>
              new AiModel.AiError({
                description: error.message,
                method: "streamText",
                module: "OpenAiModel",
                cause: error,
              }),
          ),
          Stream.withSpan("OpenAiModel.streamText"),
        ),
  });
});

export const model = (model: Model) => Layer.effect(AiModel.AiModel, make({ model }));
