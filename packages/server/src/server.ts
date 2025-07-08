import { HttpLayerRouter, HttpServer, HttpServerResponse } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { DomainApi } from "@org/domain/domain-api";
import { Layer } from "effect";
import { createServer } from "node:http";
import { StylesRpcLive } from "./domain/styles/styles-rpc-live.js";

const ApiLive = HttpLayerRouter.addHttpApi(DomainApi).pipe(Layer.provide(StylesRpcLive));

const HealthRouter = HttpLayerRouter.use((router) =>
  router.add("GET", "/health", HttpServerResponse.text("OK")),
);

const AllRoutes = Layer.mergeAll(ApiLive, HealthRouter);

const HttpLive = HttpLayerRouter.serve(AllRoutes).pipe(
  HttpServer.withLogAddress,
  Layer.provide(
    NodeHttpServer.layer(createServer, {
      port: 3000,
    }),
  ),
);

NodeRuntime.runMain(Layer.launch(HttpLive));
