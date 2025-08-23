import { envVars } from "@/lib/env-vars";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import { DomainApi } from "@org/domain/domain-api";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Random from "effect/Random";
import * as Schedule from "effect/Schedule";

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
