import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export const StyleId = Schema.UUID.pipe(Schema.brand("StyleId"));
export type StyleId = typeof StyleId.Type;

export class Style extends Schema.Class<Style>("Style")({
  id: StyleId,
  name: Schema.String,
  rule: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

export class UpsertStylePayload extends Schema.Class<UpsertStylePayload>("UpsertStylePayload")({
  id: Schema.optional(StyleId),
  name: Schema.Trim.pipe(
    Schema.nonEmptyString({
      message: () => "Name is required",
    }),
    Schema.maxLength(100, {
      message: () => "Name must be at most 100 characters long",
    }),
  ),
  rule: Schema.Trim.pipe(
    Schema.nonEmptyString({
      message: () => "Rule is required",
    }),
    Schema.maxLength(1_000, {
      message: () => "Rule must be at most 1,000 characters long",
    }),
  ),
}) {}

export class StyleNotFoundError extends Schema.TaggedError<StyleNotFoundError>(
  "StyleNotFoundError",
)(
  "StyleNotFoundError",
  { id: StyleId },
  HttpApiSchema.annotations({
    status: 404,
  }),
) {
  get message() {
    return `Style with id ${this.id} not found`;
  }
}

export class StylesGroup extends HttpApiGroup.make("styles")
  .add(HttpApiEndpoint.get("list", "/").addSuccess(Schema.Array(Style)))
  .add(
    HttpApiEndpoint.put("upsert", "/")
      .addSuccess(Style)
      .addError(StyleNotFoundError)
      .setPayload(UpsertStylePayload),
  )
  .add(
    HttpApiEndpoint.del("delete", "/")
      .setPayload(
        Schema.Struct({
          id: StyleId,
        }),
      )
      .addSuccess(Schema.Void)
      .addError(StyleNotFoundError),
  )
  .prefix("/styles") {}
