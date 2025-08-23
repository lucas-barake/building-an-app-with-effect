import * as Headers from "@effect/platform/Headers";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Arr from "effect/Array";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";

export declare namespace GoogleAiClient {
  export type Service = {
    readonly httpClient: HttpClient.HttpClient;
    readonly apiKey: Redacted.Redacted;
  };
}

export class GoogleAiClient extends Context.Tag("GoogleAiClient")<
  GoogleAiClient,
  GoogleAiClient.Service
>() {}

export const make = Effect.fnUntraced(function* (makeOptions: {
  readonly apiKey: Redacted.Redacted;
}) {
  const apiKeyHeader = "x-goog-api-key";
  yield* Effect.locallyScopedWith(Headers.currentRedactedNames, Arr.append(apiKeyHeader));

  const httpClient = (yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({
      times: 3,
      schedule: Schedule.exponential("200 millis"),
    }),
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.prependUrl("https://generativelanguage.googleapis.com"),
        HttpClientRequest.setHeader(apiKeyHeader, Redacted.value(makeOptions.apiKey)),
      ),
    ),
  );

  return GoogleAiClient.of({ httpClient, apiKey: makeOptions.apiKey });
});

export const layer = (options: { readonly apiKey: Redacted.Redacted }) =>
  Layer.scoped(GoogleAiClient, make(options));
