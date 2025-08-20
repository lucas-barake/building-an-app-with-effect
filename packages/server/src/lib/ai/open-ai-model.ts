import { HttpBody, HttpClientResponse } from "@effect/platform";
import { Effect, JSONSchema, Schema, Stream } from "effect";
import { AiError, AiModel } from "./ai-model.js";
import { OpenAiProvider } from "./open-ai-provider.js";

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

class Completion extends Schema.Class<Completion>("Completion")({
  object: Schema.Literal("response"),
  output: Schema.Array(
    Schema.Struct({
      type: Schema.Literal("message"),
      content: Schema.Array(
        Schema.Struct({
          type: Schema.Literal("output_text"),
          text: Schema.String,
        }),
      ),
    }),
  ),
}) {}

class ResponseEvent extends Schema.Class<ResponseEvent>("ResponseEvent")({
  type: Schema.String,
  delta: Schema.optional(Schema.String),
  response: Schema.optional(
    Schema.Struct({
      object: Schema.Literal("response"),
      status: Schema.Literal("in_progress", "completed", "failed", "incomplete"),
      output: Schema.optional(
        Schema.Array(
          Schema.Struct({
            type: Schema.Literal("message"),
            content: Schema.Array(
              Schema.Struct({
                type: Schema.Literal("output_text"),
                text: Schema.String,
              }),
            ),
          }),
        ),
      ),
    }),
  ),
}) {}

// ================================
// Implementation
// ================================

export type Model = "gpt-5" | "gpt-4o" | "gpt-4o-mini";

export const make = Effect.fnUntraced(function* (makeOptions: { readonly model: Model }) {
  const config = yield* OpenAiProvider;

  return AiModel.of({
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
          Effect.map((response) => response.output[0]?.content[0]?.text ?? ""),
          Effect.mapError(
            (error) =>
              new AiError({
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
          Effect.map((response) => response.output[0]?.content[0]?.text ?? ""),
          Effect.flatMap(Schema.decode(Schema.parseJson(options.schema))),
          Effect.mapError(
            (error) =>
              new AiError({
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
          Stream.mapEffect(Schema.decode(Schema.parseJson(ResponseEvent))),
          Stream.filter((event) => event.type === "response.output_text.delta"),
          Stream.map((event) => event.delta ?? ""),
          Stream.mapError(
            (error) =>
              new AiError({
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

export const model = (model: Model) => make({ model });
