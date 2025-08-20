import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Effect, Layer, Schedule, type Redacted } from "effect";

export declare namespace OpenAiProvider {
  export type Service = {
    readonly httpClient: HttpClient.HttpClient;
    readonly apiKey: Redacted.Redacted;
  };
}

export class OpenAiProvider extends Context.Tag("OpenAiProvider")<
  OpenAiProvider,
  OpenAiProvider.Service
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

  return OpenAiProvider.of({
    httpClient,
    apiKey: makeOptions.apiKey,
  });
});

export const layer = (makeOptions: { readonly apiKey: Redacted.Redacted }) =>
  Layer.scoped(OpenAiProvider, make(makeOptions));
