import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as Effect from "effect/Effect";
import * as JSONSchema from "effect/JSONSchema";
import { type JsonSchema7Object, type JsonSchema7Root } from "effect/JSONSchema";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";
import * as Stream from "effect/Stream";
import * as AiModel from "./ai-model.js";
import { GoogleAiClient } from "./google-ai-client.js";

// ================================
// OpenAPI
// ================================

const removeAdditionalProperties = (schema: unknown): unknown => {
  if (Array.isArray(schema)) {
    return schema.map(removeAdditionalProperties);
  }
  if (schema !== null && typeof schema === "object") {
    const newSchema = { ...schema };
    delete (newSchema as Partial<JsonSchema7Object>).additionalProperties;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete (newSchema as any).$ref;

    for (const key in newSchema) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (newSchema as any)[key] = removeAdditionalProperties((newSchema as any)[key]);
    }
    return newSchema;
  }
  return schema;
};

const isParseJsonTransformation = (ast: SchemaAST.AST): boolean =>
  ast.annotations[SchemaAST.SchemaIdAnnotationId] === SchemaAST.ParseJsonSchemaId;

const makeOpenApiSchema = <A, I, R>(schema: Schema.Schema<A, I, R>): JsonSchema7Root => {
  const definitions: Record<string, any> = {};

  const ast =
    SchemaAST.isTransformation(schema.ast) && isParseJsonTransformation(schema.ast.from)
      ? schema.ast.to
      : schema.ast;

  const jsonSchema = JSONSchema.fromAST(ast, {
    definitions,
    target: "openApi3.1",
    topLevelReferenceStrategy: "skip",
  });

  return removeAdditionalProperties(jsonSchema) as JsonSchema7Root;
};

// ================================
// Schemas
// ================================

class Response extends Schema.Class<Response>("Response")({
  candidates: Schema.Tuple(
    Schema.Struct({
      content: Schema.Struct({
        parts: Schema.Tuple(Schema.Struct({ text: Schema.String })),
      }),
    }),
  ),
}) {}

class StreamChunk extends Schema.Class<StreamChunk>("StreamChunk")({
  candidates: Schema.Tuple(
    Schema.Struct({
      content: Schema.Struct({
        parts: Schema.Tuple(Schema.Struct({ text: Schema.String })),
      }),
    }),
  ),
}) {}

// ================================
// Model
// ================================

export type Model = "gemini-2.5-pro" | "gemini-2.5-flash";

export const make = Effect.fnUntraced(function* (makeOptions: { readonly model: Model }) {
  const provider = yield* GoogleAiClient;

  return AiModel.AiModel.of({
    generateText: Effect.fn("generateText")((options) =>
      provider.httpClient
        .post(`/v1beta/models/${makeOptions.model}:generateContent`, {
          body: HttpBody.unsafeJson({
            ...(options.systemPrompt !== undefined && {
              systemInstruction: { parts: [{ text: options.systemPrompt }] },
            }),
            contents: [{ parts: [{ text: options.prompt }] }],
            generationConfig: {
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        })
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Response)),
          Effect.map((res) => res.candidates[0].content.parts[0].text),
          Effect.mapError(
            (error) =>
              new AiModel.AiError({
                description: error.message,
                method: "generateText",
                module: "GoogleAiModel",
                cause: error,
              }),
          ),
        ),
    ),

    generateObject: (options) =>
      provider.httpClient
        .post(`/v1beta/models/${makeOptions.model}:generateContent`, {
          body: HttpBody.unsafeJson({
            ...(options.systemPrompt !== undefined && {
              systemInstruction: { parts: [{ text: options.systemPrompt }] },
            }),
            contents: [{ parts: [{ text: options.prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: makeOpenApiSchema(options.schema),
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        })
        .pipe(
          Effect.flatMap(HttpClientResponse.schemaBodyJson(Response)),
          Effect.map((res) => res.candidates[0].content.parts[0].text),
          Effect.flatMap(Schema.decode(Schema.parseJson(options.schema))),
          Effect.mapError(
            (error) =>
              new AiModel.AiError({
                description: error.message,
                method: "generateObject",
                module: "GoogleAiModel",
                cause: error,
              }),
          ),
        ),

    streamText: (options) =>
      provider.httpClient
        .post(`/v1beta/models/${makeOptions.model}:streamGenerateContent?alt=sse`, {
          body: HttpBody.unsafeJson({
            ...(options.systemPrompt !== undefined && {
              systemInstruction: { parts: [{ text: options.systemPrompt }] },
            }),
            contents: [{ parts: [{ text: options.prompt }] }],
            generationConfig: {
              thinkingConfig: {
                thinkingBudget: 0,
              },
              ...(options.schema !== undefined && {
                responseSchema: makeOpenApiSchema(options.schema),
                responseMimeType: "application/json",
              }),
            },
          }),
        })
        .pipe(
          HttpClientResponse.stream,
          Stream.decodeText("utf-8"),
          Stream.splitLines,
          Stream.filter((line) => line.startsWith("data:") && line !== "data: [DONE]"),
          Stream.map((line) => line.slice(5)),
          Stream.mapEffect(Schema.decode(Schema.parseJson(StreamChunk))),
          Stream.map((chunk) => chunk.candidates[0].content.parts[0].text),
          Stream.mapError(
            (error) =>
              new AiModel.AiError({
                description: error.message,
                method: "streamText",
                module: "GoogleAiModel",
                cause: error,
              }),
          ),
        ),
  });
});

export const model = (model: Model) => Layer.effect(AiModel.AiModel, make({ model }));
