import * as Schema from "effect/Schema";

export type PaginationResult<T> = {
  readonly data: ReadonlyArray<T>;
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
};

/**
 * Creates a schema for paginated results containing an array of items and pagination metadata.
 *
 * @category schema
 * @param itemSchema The schema for individual items in the data array
 * @returns A schema for the complete pagination result
 * @example
 * ```ts
 * import { Asset } from "./assets/AssetsContract.js"
 *
 * const AssetPaginationSchema = PaginationSchema(Asset)
 * // Result type: { data: Asset[], total: number, limit: number, offset: number, hasMore: boolean }
 * ```
 */
export const PaginationSchema = <A, I, R>(
  itemSchema: Schema.Schema<A, I, R>,
): Schema.Schema<PaginationResult<A>, PaginationResult<I>, R> =>
  Schema.Struct({
    data: Schema.Array(itemSchema),
    total: Schema.Number,
    limit: Schema.Number,
    offset: Schema.Number,
    hasMore: Schema.Boolean,
  });

export const DEFAULT_PAGINATION_LIMIT = 100;
export const DEFAULT_PAGINATION_OFFSET = 0;

export class PaginationQuery extends Schema.Class<PaginationQuery>("PaginationQuery")({
  limit: Schema.optional(Schema.Int.pipe(Schema.lessThanOrEqualTo(200))).pipe(
    Schema.withDefaults({
      constructor: () => DEFAULT_PAGINATION_LIMIT,
      decoding: () => DEFAULT_PAGINATION_LIMIT,
    }),
  ),
  offset: Schema.optional(Schema.Int.pipe(Schema.nonNegative())).pipe(
    Schema.withDefaults({
      constructor: () => DEFAULT_PAGINATION_OFFSET,
      decoding: () => DEFAULT_PAGINATION_OFFSET,
    }),
  ),
}) {}
