import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

export const SearchEvent = Schema.Union(
  Schema.TaggedStruct("Ka", {}),
  Schema.TaggedStruct("SearchingWeb", {}),
  Schema.TaggedStruct("EvaluatingCandidates", {}),
  Schema.TaggedStruct("Summarizing", {}),
  Schema.TaggedStruct("Chunk", { delta: Schema.String }),
  Schema.TaggedStruct("Completed", { text: Schema.String }),
);
export type SearchEvent = typeof SearchEvent.Type;

export class NoSearchResultsFound extends Schema.TaggedError<NoSearchResultsFound>(
  "NoSearchResultsFound",
)("NoSearchResultsFound", {}) {}

export class RpcDef extends RpcGroup.make(
  Rpc.make("search", {
    payload: Schema.Struct({
      query: Schema.Trim,
    }),
    stream: true,
    success: SearchEvent,
    error: NoSearchResultsFound,
  }),
) {}
