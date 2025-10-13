import { NoSearchResultsFound, RpcDef, SearchEvent } from "@org/domain/rpc-def";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Mailbox from "effect/Mailbox";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { Evaluator } from "./services/evaluator.js";
import { Summarizer } from "./services/summarizer.js";
import { WebSearcher } from "./services/web-searcher.js";

export const RpcDefLive = RpcDef.toLayer(
  Effect.gen(function* () {
    const webSearcher = yield* WebSearcher;
    const evaluator = yield* Evaluator;
    const summarizer = yield* Summarizer;

    const ka = { _tag: "Ka" } as const;
    const kaStream = Stream.tick("2 seconds").pipe(Stream.map(() => ka));

    return RpcDef.of({
      search: Effect.fn(function* (payload) {
        const mailbox = yield* Mailbox.make<SearchEvent, NoSearchResultsFound>();

        yield* Effect.forkScoped(Stream.runForEach(kaStream, (event) => mailbox.offer(event)));

        yield* Effect.forkScoped(
          Effect.gen(function* () {
            yield* mailbox.offer({ _tag: "SearchingWeb" });
            const searchResults = yield* webSearcher.search(payload.query);
            if (Array.isEmptyReadonlyArray(searchResults)) return yield* new NoSearchResultsFound();

            yield* mailbox.offer({ _tag: "EvaluatingCandidates" });
            const satisfyingIds = yield* evaluator.evaluate(payload.query, searchResults);

            const satisfyingContents = Array.filterMap(searchResults, (searchItem) =>
              satisfyingIds.includes(searchItem.id)
                ? Option.some(searchItem.markdown)
                : Option.none(),
            );
            if (Array.isEmptyReadonlyArray(satisfyingContents))
              return yield* new NoSearchResultsFound();

            yield* mailbox.offer({ _tag: "Summarizing" });
            const text = yield* summarizer.summarize(payload.query, satisfyingContents).pipe(
              Stream.tap((part) =>
                part.type === "text-delta"
                  ? mailbox.offer({ _tag: "Chunk", delta: part.delta })
                  : Effect.void,
              ),
              Stream.runFold("", (accumulated, chunk) => accumulated + chunk),
            );

            yield* mailbox.offer({ _tag: "Completed", text });
          }).pipe(
            Effect.timeout("2 minutes"),
            Effect.catchTag("TimeoutException", (error) => Effect.die(error)),
            Effect.onError((cause) => mailbox.failCause(cause)),
          ),
        );

        return mailbox;
      }),
    });
  }),
).pipe(Layer.provide(Layer.mergeAll(WebSearcher.Default, Evaluator.Default, Summarizer.Default)));
