import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";

export declare namespace OpenAiClient {
  export type Service = {
    readonly httpClient: HttpClient.HttpClient;
    readonly apiKey: Redacted.Redacted;
  };
}

export class OpenAiClient extends Context.Tag("OpenAiClient")<
  OpenAiClient,
  OpenAiClient.Service
>() {}

export const make = Effect.fnUntraced(function* (makeOptions: {
  readonly apiKey: Redacted.Redacted;
}) {
  const httpClient = (yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({
      times: 3,
      schedule: Schedule.exponential("200 millis"),
    }),
    HttpClient.mapRequest((request) =>
      request.pipe(
        HttpClientRequest.prependUrl("https://api.openai.com"),
        HttpClientRequest.bearerToken(makeOptions.apiKey),
        HttpClientRequest.setHeader("Content-Type", "application/json"),
      ),
    ),
  );

  return OpenAiClient.of({
    httpClient,
    apiKey: makeOptions.apiKey,
  });
});

export const layer = (makeOptions: { readonly apiKey: Redacted.Redacted }) =>
  Layer.scoped(OpenAiClient, make(makeOptions));
