import * as OtlpTracer from "@effect/opentelemetry/OtlpTracer";
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter";
import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as Layer from "effect/Layer";
import { createServer } from "node:http";

const HealthRouter = HttpLayerRouter.use((router) =>
  router.add("GET", "/health", HttpServerResponse.text("OK")),
);

const AllRoutes = HealthRouter.pipe(
  Layer.provide(
    HttpLayerRouter.cors({
      allowedOrigins: ["*"],
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
      credentials: true,
    }),
  ),
);

const TracerLive = OtlpTracer.layer({
  url: "http://localhost:4318/v1/traces",
  resource: {
    serviceName: "effect-is-awesome",
  },
}).pipe(Layer.provide(FetchHttpClient.layer));

const HttpLive = HttpLayerRouter.serve(AllRoutes).pipe(
  HttpMiddleware.withTracerDisabledWhen(
    (request) => request.url === "/health" || request.method === "OPTIONS",
  ),
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 })),
  Layer.provide(TracerLive),
);

NodeRuntime.runMain(Layer.launch(HttpLive));
