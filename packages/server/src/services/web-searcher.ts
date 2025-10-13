import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as RateLimiter from "effect/RateLimiter";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import { randomUUID } from "node:crypto";

export const SearchItem = Schema.Struct({
  id: Schema.optional(Schema.UUID).pipe(
    Schema.withDecodingDefault(() => randomUUID()),
  ),
  url: Schema.URL,
  title: Schema.String,
  description: Schema.String,
  position: Schema.Number.pipe(
    Schema.annotations({
      description:
        "The position of the result in the search results",
    }),
  ),
  markdown: Schema.String.pipe(
    Schema.annotations({
      description: "The scraped markdown content",
    }),
  ),
});
export type SearchItem = typeof SearchItem.Type;

const SearchResult = Schema.Struct({
  data: Schema.Struct({
    web: Schema.Array(SearchItem),
  }),
});

export class WebSearcher extends Effect.Service<WebSearcher>()(
  "@org/WebSearcher",
  {
    dependencies: [FetchHttpClient.layer],
    scoped: Effect.gen(function* () {
      const apiKey = yield* Config.redacted(
        "FIRECRAWL_API_KEY",
      );

      const rateLimiter = yield* RateLimiter.make({
        limit: 10,
        interval: "1 minute",
      });

      const httpClient =
        (yield* HttpClient.HttpClient).pipe(
          HttpClient.transform((effect, _request) =>
            rateLimiter(effect),
          ),
          HttpClient.mapRequest((req) =>
            req.pipe(
              HttpClientRequest.bearerToken(apiKey),
              HttpClientRequest.prependUrl(
                "https://api.firecrawl.dev/v2",
              ),
            ),
          ),
          HttpClient.filterStatusOk,
          HttpClient.retryTransient({
            schedule: Schedule.exponential("1 second", 2.5),
            times: 3,
          }),
        );

      return {
        search: Effect.fn("WebSearcher.search")(
          (query: string) =>
            httpClient.post("/search", {
              body: HttpBody.unsafeJson({
                query,
                limit: 3,
                scrapeOptions: {
                  formats: ["markdown"],
                },
              }),
            }),
          Effect.flatMap(
            HttpClientResponse.schemaBodyJson(SearchResult),
          ),
          Effect.map((result) => result.data.web),
          Effect.orDie,
        ),
      } as const;
    }),
  },
) {}
