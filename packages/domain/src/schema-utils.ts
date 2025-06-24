import * as Array from "effect/Array";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Equal from "effect/Equal";
import { identity } from "effect/Function";
import * as Hash from "effect/Hash";
import * as HashSet from "effect/HashSet";
import * as ParseResult from "effect/ParseResult";
import { ArrayFormatter, type ParseIssue } from "effect/ParseResult";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import type * as SchemaAST from "effect/SchemaAST";
import * as Struct from "effect/Struct";

// ---------------
// Schemas
// ---------------

export class DurationFromSeconds extends Schema.transform(
  Schema.NonNegative.annotations({
    description: "a non-negative number of seconds to be decoded into a Duration",
  }),
  Schema.DurationFromSelf,
  {
    strict: true,
    decode: (i) => Duration.seconds(i),
    encode: (a) => Duration.toSeconds(a),
  },
) {}

export class DurationFromDeltaSecondsString extends Schema.compose(
  Schema.NumberFromString,
  DurationFromSeconds,
).annotations({
  title: "DurationFromDeltaSecondsString",
  description: "parses a string of non-negative delta-seconds into a Duration",
}) {}

export type FormFieldSchema = {
  readonly type?:
    | "object"
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "array"
    | "null"
    | undefined;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly default?: unknown | undefined;
  readonly minLength?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly pattern?: string | undefined;
  readonly format?: "email" | "date" | "time" | "date-time" | "uri" | "uuid" | string | undefined;
  readonly minimum?: number | undefined;
  readonly maximum?: number | undefined;
  readonly exclusiveMinimum?: number | undefined;
  readonly exclusiveMaximum?: number | undefined;
  readonly multipleOf?: number | undefined;
  readonly items?: unknown | undefined;
  readonly minItems?: number | undefined;
  readonly maxItems?: number | undefined;
  readonly uniqueItems?: boolean | undefined;
  readonly properties?: Record<string, object> | undefined;
  readonly required?: ReadonlyArray<string> | undefined;
  readonly additionalProperties?: boolean | object | undefined;
  readonly enum?: ReadonlyArray<unknown> | undefined;
  readonly const?: unknown | undefined;
  readonly allOf?: ReadonlyArray<object> | undefined;
  readonly anyOf?: ReadonlyArray<object> | undefined;
  readonly oneOf?: ReadonlyArray<object> | undefined;
  readonly not?: object | undefined;
  readonly if?: object | undefined;
  readonly then?: object | undefined;
  readonly else?: object | undefined;
  readonly readOnly?: boolean | undefined;
  readonly writeOnly?: boolean | undefined;
};

export const FormFieldSchema = Schema.Struct({
  type: Schema.optional(
    Schema.Literal("object", "string", "number", "integer", "boolean", "array", "null"),
  ),
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  default: Schema.optional(Schema.Unknown),

  // String
  minLength: Schema.optional(Schema.Number),
  maxLength: Schema.optional(Schema.Number),
  pattern: Schema.optional(Schema.String),
  format: Schema.optional(
    Schema.Union(
      Schema.Literal("email", "date", "time", "date-time", "uri", "uuid"),
      Schema.String,
    ),
  ),

  // Number
  minimum: Schema.optional(Schema.Number),
  maximum: Schema.optional(Schema.Number),
  exclusiveMinimum: Schema.optional(Schema.Number),
  exclusiveMaximum: Schema.optional(Schema.Number),
  multipleOf: Schema.optional(Schema.Number),

  // Array
  items: Schema.optional(Schema.Unknown),
  minItems: Schema.optional(Schema.Number),
  maxItems: Schema.optional(Schema.Number),
  uniqueItems: Schema.optional(Schema.Boolean),

  // Object
  properties: Schema.optional(
    Schema.Record({
      key: Schema.String,
      value: Schema.Object,
    }),
  ),
  required: Schema.optional(Schema.Array(Schema.String)),
  additionalProperties: Schema.optional(Schema.Union(Schema.Boolean, Schema.Object)),

  // Validation
  enum: Schema.optional(Schema.Array(Schema.Unknown)),
  const: Schema.optional(Schema.Unknown),

  // Composition
  allOf: Schema.optional(Schema.Array(Schema.Object)),
  anyOf: Schema.optional(Schema.Array(Schema.Object)),
  oneOf: Schema.optional(Schema.Array(Schema.Object)),
  not: Schema.optional(Schema.Object),

  // Conditional
  if: Schema.optional(Schema.Object),
  then: Schema.optional(Schema.Object),
  else: Schema.optional(Schema.Object),

  // UI
  readOnly: Schema.optional(Schema.Boolean),
  writeOnly: Schema.optional(Schema.Boolean),
});

/**
 * A schema for validating JSON Schema objects using AJV.
 * Validates that an object conforms to the JSON Schema specification.
 *
 * @category schema
 */
export const FormJsonSchema = Schema.parseJson(
  Schema.Struct({
    type: Schema.Literal("object"),
    properties: Schema.Record({
      key: Schema.String,
      value: FormFieldSchema,
    }),

    title: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),
    required: Schema.optional(Schema.Array(Schema.String)),

    minProperties: Schema.optional(Schema.Number),
    maxProperties: Schema.optional(Schema.Number),

    $schema: Schema.optional(Schema.String),
    $id: Schema.optional(Schema.String),
    definitions: Schema.optional(
      Schema.Record({
        key: Schema.String,
        value: FormFieldSchema,
      }),
    ),
  }),
).annotations({
  identifier: "FormJsonSchema",
});
export type FormJsonSchema = typeof FormJsonSchema.Type;

/**
 * A schema for validating email addresses.
 *
 * @category schema
 */
export const Email = (opts?: {
  requiredMessage?: string;
  invalidMessage?: string;
}): Schema.refine<string, Schema.filter<typeof Schema.Trim>> =>
  Schema.Trim.pipe(
    Schema.minLength(1, {
      message: () => opts?.requiredMessage ?? "Email is required",
    }),
    Schema.pattern(
      /^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i,
      {
        message: () => opts?.invalidMessage ?? "Invalid email",
      },
    ),
    Schema.annotations({
      identifier: "Email",
    }),
  );

/**
 * A schema for validating URL strings.
 *
 * @category schema
 */
export const URLString: Schema.transform<typeof Schema.URL, typeof Schema.String> = Schema.URL.pipe(
  Schema.transform(Schema.String, {
    decode: (input) => input.toString(),
    encode: (input) => new URL(input),
    strict: true,
  }),
);

/**
 * A schema for destructive transformations when you need to infer the type from the result of the transformation callback, without specifying the encoded type.
 *
 * @category schema
 */
export function destructiveTransform<A, B>(
  transform: (input: A) => B,
): <I, R>(self: Schema.Schema<A, I, R>) => Schema.Schema<Readonly<B>, I, R> {
  return <I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<Readonly<B>, I, R> => {
    return Schema.transformOrFail(self, Schema.Any as Schema.Schema<Readonly<B>>, {
      decode: (input) =>
        ParseResult.try({
          try: () => transform(input) as Readonly<B>,
          catch: () => new ParseResult.Type(self.ast, input, "Error applying transformation"),
        }),
      encode: () =>
        ParseResult.fail(
          new ParseResult.Forbidden(
            self.ast,
            "Encoding is not supported for destructive transformations",
          ),
        ),
    });
  };
}

/**
 * A schema for trimming and validating non-empty strings.
 *
 * @category schema
 */
export const TrimNonEmpty = (opts?: {
  message?: string;
}): Schema.refine<string, Schema.filter<typeof Schema.Trim>> =>
  Schema.Trim.pipe(
    Schema.minLength(1),
    Schema.maxLength(5000),
    Schema.annotations({
      message: () => opts?.message ?? "Expected a non-empty trimmed string",
      override: true,
    }),
  );

/**
 * Creates a schema that allows null values and falls back to null on decoding errors.
 *
 * @category schema
 */
export const NullOrFromFallible = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Schema.NullOr<Schema.Schema<A, I, R>> =>
  Schema.NullOr(schema).pipe(
    Schema.annotations({
      decodingFallback: () => Either.right(null),
    }),
  );

/**
 * Transforms optional null/undefined values to required null values
 *
 * @category schema
 */
export const NullOrFromOptional = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Schema.PropertySignature<
  ":",
  Exclude<A, undefined> | null,
  never,
  "?:",
  I | null | undefined,
  true,
  R
> =>
  Schema.NullishOr(schema).pipe(
    Schema.optional,
    Schema.withDefaults({
      constructor: () => null,
      decoding: () => null,
    }),
  );

/**
 * A schema for transforming a partitioned array of invalid values into a non-nullable array.
 *
 * @category schema
 */
export const ArrayFromFallible = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Schema.transform<
  Schema.Array$<Schema.NullOr<Schema.Schema<A, I, R>>>,
  Schema.SchemaClass<ReadonlyArray<A>, ReadonlyArray<A>, never>
> =>
  Schema.Array(
    Schema.NullOr(schema).annotations({
      decodingFallback: (issue) =>
        Effect.zipRight(
          Effect.logWarning(
            `[ArrayFromFallible] ${ParseResult.TreeFormatter.formatIssueSync(issue)}`,
          ),
          Effect.succeed(null),
        ),
    }),
  ).pipe(
    Schema.transform(Schema.typeSchema(Schema.Array(schema)), {
      decode: (array) => array.filter(Predicate.isNotNull),
      encode: identity,
      strict: true,
    }),
  );

/**
 * A schema for transforming a partitioned array of invalid values into a non-nullable HashSet.
 *
 * @category schema
 */
export const HashSetFromFallibleArray = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Schema.transform<
  Schema.transform<
    Schema.Array$<Schema.NullOr<Schema.Schema<A, I, R>>>,
    Schema.SchemaClass<ReadonlyArray<A>, ReadonlyArray<A>, never>
  >,
  Schema.SchemaClass<HashSet.HashSet<A>, HashSet.HashSet<A>, never>
> =>
  ArrayFromFallible(schema).pipe(
    Schema.transform(Schema.typeSchema(Schema.HashSet(schema)), {
      decode: (array) => HashSet.fromIterable(array),
      encode: (hashSet) => Array.fromIterable(hashSet),
      strict: true,
    }),
  );

/**
 * A schema for transforming a partitioned array of invalid values into a non-nullable Set.
 *
 * @category schema
 */
export const SetFromFallibleArray = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Schema.transform<
  Schema.transform<
    Schema.Array$<Schema.NullOr<Schema.Schema<A, I, R>>>,
    Schema.SchemaClass<ReadonlyArray<A>, ReadonlyArray<A>, never>
  >,
  Schema.SchemaClass<Set<A>, Set<A>, never>
> =>
  ArrayFromFallible(schema).pipe(
    Schema.transform(Schema.typeSchema(Schema.Set(schema)), {
      decode: (array) => new Set(array),
      encode: (set) => Array.fromIterable(set),
      strict: true,
    }),
  );

/**
 * Creates a schema that transforms an array into a HashSet during decoding and back to an array during encoding.
 *
 * @category schema
 * @param schema The schema for the elements in the array/HashSet
 * @returns A schema that transforms between Array<A> and HashSet<A>
 * @example
 * ```ts
 * const numberHashSet = HashSetFromIterable(Schema.Number)
 * // Decoding: number[] -> HashSet<number>
 * // Encoding: HashSet<number> -> number[]
 * ```
 */
export const HashSetFromIterable = <A, I, R>(
  schema: Schema.Schema<A, I, R>,
): Schema.transform<
  Schema.Array$<Schema.Schema<A, I, R>>,
  Schema.SchemaClass<HashSet.HashSet<A>, HashSet.HashSet<A>, never>
> =>
  Schema.transform(Schema.Array(schema), Schema.typeSchema(Schema.HashSet(schema)), {
    strict: true,
    decode: (array) => HashSet.fromIterable(array),
    encode: (hashSet) => Array.fromIterable(hashSet),
  });

// ---------------
// Formatting
// ---------------

/**
 * Formats parse issues into a readable string, including the path for each issue.
 *
 * @category formatting
 * @param issue The ParseIssue to be formatted
 * @param opts Optional configuration:
 *   - newLines: number of newlines between messages
 *   - numbered: whether to prefix messages with numbers (1., 2., etc)
 * @returns An Effect that resolves to a formatted string of parse issues
 */
export const formatParseIssueMessages = (
  issue: ParseIssue,
  opts?: {
    newLines?: number;
    numbered?: boolean;
  },
): Effect.Effect<string, never, never> =>
  ArrayFormatter.formatIssue(issue).pipe(
    Effect.map((issues) =>
      issues
        .map(
          ({ message, path }, index) =>
            `${opts?.numbered === true ? `${index + 1}. ` : ""}[${path.length > 0 ? path.join(".") : "ROOT"}] ${message}`,
        )
        .join("\n".repeat(opts?.newLines ?? 1)),
    ),
  );

// ---------------
// Equality/Hash Utilities
// ---------------

export const noHashKey = Symbol("noHashKey");
/**
 * A schema for adding equality and hash functions to a resulting record.
 *
 * @category schema
 */
export const WithEquality =
  <A extends Record<string, unknown>, I, R>({
    equalityFn,
    hashKey,
  }:
    | {
        hashKey: keyof A;
        equalityFn?: (a: A, b: A) => boolean;
      }
    | {
        hashKey: typeof noHashKey;
        equalityFn: (a: A, b: A) => boolean;
      }) =>
  (schema: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> =>
    Schema.transform(schema, Schema.Any, {
      decode: (value: A) => {
        const extensions: Partial<Record<symbol, unknown>> = {
          [Hash.symbol](this: A): number {
            if (hashKey === noHashKey) {
              return 0;
            }
            return Hash.cached(this, Hash.hash(this[hashKey]));
          },
          [Equal.symbol](that: unknown): boolean {
            if (!Schema.is(schema)(that)) {
              return false;
            }

            if (equalityFn !== undefined) {
              return equalityFn(this as unknown as A, that);
            }

            return Hash.hash(this) === Hash.hash(that);
          },
        };

        if (equalityFn !== undefined) {
          extensions[Equal.symbol] = function (that: unknown): boolean {
            return (
              Equal.isEqual(that) &&
              Schema.is(schema)(that) &&
              equalityFn(this as unknown as A, that)
            );
          };
        }

        return Object.assign(value, extensions);
      },
      encode: identity,
      strict: true,
    });

// ---------------
// Transformations
// ---------------

/**
 * Creates a schema that derives and attaches a property to the original schema.
 *
 * @category transformation
 */
export const deriveAndAttachProperty =
  <
    const Key extends string,
    FromA extends Record<string, unknown>,
    FromI,
    FromR,
    ToA,
    ToI,
    ToR,
    DecodeR = never,
  >(args: {
    key: Key;
    typeSchema: Schema.Schema<ToA, ToI, ToR>;
    decode: (input: FromA) => Effect.Effect<ToA, never, DecodeR>;
  }) =>
  (
    self: Schema.Schema<FromA, FromI, FromR>,
  ): Schema.Schema<FromA & { readonly [K in Key]: ToA }, FromI, FromR | ToR | DecodeR> => {
    const derivedSchema = Schema.typeSchema(
      Schema.Struct({
        [args.key]: args.typeSchema,
      } as const),
    );

    const extendedSchema = Schema.extend(Schema.typeSchema(self), derivedSchema);

    return Schema.transformOrFail(self, Schema.typeSchema(extendedSchema), {
      decode: (input) =>
        Effect.gen(function* () {
          const result = args.decode(input);

          if (Effect.isEffect(result)) {
            return yield* result.pipe(
              Effect.map((value) => ({
                ...input,
                [args.key]: value,
              })),
            );
          }

          return {
            ...input,
            [args.key]: result,
          };
        }),
      encode: (struct) => ParseResult.succeed(Struct.omit(args.key)(struct)),
      strict: false,
    });
  };

/**
 * Lifts a `Schema` to a `PropertySignature` and enhances it by specifying a different key for it in the Encoded type.
 *
 * @category schema
 */
export const fromKey: <const K extends string>(
  key: K,
) => <A, I, R>(
  self: Schema.Schema<A, I, R>,
) => Schema.PropertySignature<":", A, K, ":", I, false, R> =
  <const K extends string>(key: K) =>
  <A, I, R>(self: Schema.Schema<A, I, R>) =>
    self.pipe(Schema.propertySignature, Schema.fromKey(key));

/**
 * Reverses a schema, i.e., swaps the encoded and decoded types.
 *
 * @category schema
 */
export const reverseSchema = <A, I, R>(schema: Schema.Schema<A, I, R>): Schema.Schema<I, A, R> =>
  Schema.transformOrFail(Schema.typeSchema(schema), Schema.encodedSchema(schema), {
    decode: ParseResult.encode(schema),
    encode: ParseResult.decode(schema),
  });

// ---------------
// General Utilities
// ---------------

/**
 * Creates a struct schema with a fixed `_tag` property and additional fields.
 * The `_tag` property is set to the provided tag value and is optional with a default.
 *
 * @category schema
 * @param tag The literal value for the `_tag` property
 * @param fields The fields to include in the struct
 * @returns A schema for the tagged struct
 */
export const TaggedStruct = <
  Tag extends SchemaAST.LiteralValue,
  Fields extends Schema.Struct.Fields,
>(
  tag: Tag,
  fields: Fields,
): Schema.Struct<
  {
    _tag: Schema.PropertySignature<
      ":",
      Exclude<Tag, undefined>,
      never,
      "?:",
      Tag | undefined,
      true,
      never
    >;
  } & Fields
> =>
  Schema.Struct({
    _tag: Schema.Literal(tag).pipe(
      Schema.optional,
      Schema.withDefaults({
        constructor: () => tag,
        decoding: () => tag,
      }),
    ),
    ...fields,
  });
