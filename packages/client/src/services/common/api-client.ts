import { envVars } from "@/lib/env-vars";
import { FetchHttpClient, HttpApiClient, HttpClient } from "@effect/platform";
import { DomainApi } from "@org/domain/domain-api";
import { Duration, Effect, Random, Schedule } from "effect";

export class ApiClient extends Effect.Service<ApiClient>()("@org/ApiClient", {
  dependencies: [FetchHttpClient.layer],
  scoped: Effect.gen(function* () {
    return {
      http: yield* HttpApiClient.make(DomainApi, {
        baseUrl: envVars.API_URL,
        transformClient: (client) =>
          client.pipe(
            HttpClient.transformResponse(
              Effect.fnUntraced(function* (response) {
                if (envVars.EFFECTIVE_ENV === "dev") {
                  const sleepFor = yield* Random.nextRange(200, 500);
                  yield* Effect.sleep(Duration.millis(sleepFor));
                }
                return yield* response;
              }),
            ),
            HttpClient.retryTransient({
              times: 3,
              schedule: Schedule.exponential("100 millis"),
            }),
          ),
      }),
    } as const;
  }),
}) {}
