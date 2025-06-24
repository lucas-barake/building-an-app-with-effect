/* eslint-disable */
import * as HttpApi from "@effect/platform/HttpApi";
import type * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import type * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import type * as HttpApiMiddleware from "@effect/platform/HttpApiMiddleware";
import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as HttpBody from "@effect/platform/HttpBody";
import * as HttpClient from "@effect/platform/HttpClient";
import type * as HttpClientError from "@effect/platform/HttpClientError";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import type * as HttpClientResponse from "@effect/platform/HttpClientResponse";
import * as HttpMethod from "@effect/platform/HttpMethod";
import * as UrlParams from "@effect/platform/UrlParams";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { identity } from "effect/Function";
import { globalValue } from "effect/GlobalValue";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import type * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import type * as AST from "effect/SchemaAST";
import type { Simplify } from "effect/Types";

const paramsRegex = /:(\w+)/g;

const compilePath = (path: string) => {
  const segments = path.split(paramsRegex);
  const len = segments.length;
  if (len === 1) {
    return (_: any) => path;
  }
  return (params: Record<string, string>) => {
    let url = segments[0]!;
    for (let i = 1; i < len; i++) {
      if (i % 2 === 0) {
        url += segments[i]!;
      } else {
        url += params[segments[i]!];
      }
    }
    return url;
  };
};

const HttpBodyFromSelf = Schema.declare(HttpBody.isHttpBody);

const payloadSchemaBody = (schema: Schema.Schema.All): Schema.Schema<any, HttpBody.HttpBody> => {
  const members = schema.ast._tag === "Union" ? schema.ast.types : [schema.ast];
  return Schema.Union(...members.map(bodyFromPayload)) as any;
};

const bodyFromPayloadCache = globalValue(
  "@org/UnsafeHttpApiClient/bodyFromPayloadCache",
  () => new WeakMap<AST.AST, Schema.Schema.Any>(),
);

const bodyFromPayload = (ast: AST.AST) => {
  if (bodyFromPayloadCache.has(ast)) {
    return bodyFromPayloadCache.get(ast)!;
  }
  const schema = Schema.make(ast);
  const encoding = HttpApiSchema.getEncoding(ast);
  const transform = Schema.transformOrFail(HttpBodyFromSelf, schema, {
    decode(fromA, _, ast) {
      return ParseResult.fail(new ParseResult.Forbidden(ast, fromA, "encode only schema"));
    },
    encode(toI, _, ast) {
      switch (encoding.kind) {
        case "Json": {
          return HttpBody.json(toI).pipe(
            ParseResult.mapError(
              (error) => new ParseResult.Type(ast, toI, `Could not encode as JSON: ${error}`),
            ),
          );
        }
        case "Text": {
          if (typeof toI !== "string") {
            return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a string"));
          }
          return ParseResult.succeed(HttpBody.text(toI));
        }
        case "UrlParams": {
          return ParseResult.succeed(HttpBody.urlParams(UrlParams.fromInput(toI as any)));
        }
        case "Uint8Array": {
          if (!(toI instanceof Uint8Array)) {
            return ParseResult.fail(new ParseResult.Type(ast, toI, "Expected a Uint8Array"));
          }
          return ParseResult.succeed(HttpBody.uint8Array(toI));
        }
      }
    },
  });
  bodyFromPayloadCache.set(ast, transform);
  return transform;
};

export type UnsafeClient<Groups extends HttpApiGroup.HttpApiGroup.Any, ApiError> = Simplify<
  {
    readonly [Group in Extract<
      Groups,
      { readonly topLevel: false }
    > as HttpApiGroup.HttpApiGroup.Name<Group>]: UnsafeClient.Group<
      Group,
      Group["identifier"],
      ApiError
    >;
  } & {
    readonly [Method in UnsafeClient.TopLevelMethods<Groups, ApiError> as Method[0]]: Method[1];
  }
>;

type OmitWithResponse<T> = T extends object ? Omit<T, "withResponse"> : T;

export declare namespace UnsafeClient {
  export type Group<
    Groups extends HttpApiGroup.HttpApiGroup.Any,
    GroupName extends Groups["identifier"],
    ApiError,
  > = [HttpApiGroup.HttpApiGroup.WithName<Groups, GroupName>] extends [
    HttpApiGroup.HttpApiGroup<
      infer _GroupName,
      infer _Endpoints,
      infer _GroupError,
      infer _GroupErrorR
    >,
  ]
    ? {
        readonly [Endpoint in _Endpoints as HttpApiEndpoint.HttpApiEndpoint.Name<Endpoint>]: Method<
          Endpoint,
          ApiError,
          _GroupError
        >;
      }
    : never;

  export type Method<Endpoint, ApiError, GroupError> = [Endpoint] extends [
    HttpApiEndpoint.HttpApiEndpoint<
      infer _Name,
      infer _Method,
      infer _Path,
      infer _UrlParams,
      infer _Payload,
      infer _Headers,
      infer _Success,
      infer _Error,
      infer _R,
      infer _RE
    >,
  ]
    ? (
        request: Simplify<
          OmitWithResponse<
            HttpApiEndpoint.HttpApiEndpoint.ClientRequest<
              _Path,
              _UrlParams,
              _Payload,
              _Headers,
              false
            >
          >
        >,
      ) => Effect.Effect<
        HttpClientResponse.HttpClientResponse,
        _Error | GroupError | ApiError | HttpClientError.HttpClientError
      >
    : never;

  export type TopLevelMethods<Groups extends HttpApiGroup.HttpApiGroup.Any, ApiError> =
    Extract<Groups, { readonly topLevel: true }> extends HttpApiGroup.HttpApiGroup<
      infer _Id,
      infer _Endpoints,
      infer _Error,
      infer _ErrorR,
      infer _TopLevel
    >
      ? _Endpoints extends infer Endpoint
        ? [HttpApiEndpoint.HttpApiEndpoint.Name<Endpoint>, Method<Endpoint, ApiError, _Error>]
        : never
      : never;
}

const makeUnsafeClientInternal = <
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiR,
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options: {
    readonly predicate?: Predicate.Predicate<{
      readonly endpoint: HttpApiEndpoint.HttpApiEndpoint.AnyWithProps;
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
    }>;
    readonly onGroup?: (options: {
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
      readonly mergedAnnotations: Context.Context<never>;
    }) => void;
    readonly onEndpoint: (options: {
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps;
      readonly endpoint: HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod.HttpMethod>;
      readonly mergedAnnotations: Context.Context<never>;
      readonly middleware: ReadonlySet<HttpApiMiddleware.TagClassAny>;
      readonly endpointFn: Function;
    }) => void;
    readonly transformClient?:
      | ((client: HttpClient.HttpClient) => HttpClient.HttpClient)
      | undefined;
    readonly baseUrl?: URL | string | undefined;
  },
): Effect.Effect<
  void,
  never,
  | HttpApiMiddleware.HttpApiMiddleware.Without<
      ApiR | HttpApiGroup.HttpApiGroup.ClientContext<Groups>
    >
  | HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const context = yield* Effect.context<any>();
    const httpClient = (yield* HttpClient.HttpClient).pipe(
      options.baseUrl === undefined
        ? identity
        : HttpClient.mapRequest(HttpClientRequest.prependUrl(options.baseUrl.toString())),
      options.transformClient ?? identity,
    );
    HttpApi.reflect(api as any, {
      ...(options.predicate && { predicate: options.predicate }),
      onGroup(onGroupOptions) {
        options.onGroup?.(onGroupOptions);
      },
      onEndpoint(onEndpointOptions) {
        const { endpoint } = onEndpointOptions;
        const makeUrl = compilePath(endpoint.path);

        const encodePayloadBody = endpoint.payloadSchema.pipe(
          Option.map((schema) => {
            if (HttpMethod.hasBody(endpoint.method)) {
              return Schema.encodeUnknown(payloadSchemaBody(schema as any));
            }
            return Schema.encodeUnknown(schema);
          }),
        );
        const encodeHeaders = endpoint.headersSchema.pipe(Option.map(Schema.encodeUnknown));
        const encodeUrlParams = endpoint.urlParamsSchema.pipe(Option.map(Schema.encodeUnknown));
        const endpointFn = (request?: {
          readonly path?: any;
          readonly urlParams?: any;
          readonly payload?: any;
          readonly headers?: any;
        }) =>
          Effect.gen(function* () {
            let url = endpoint.path;
            if (request?.path) {
              url = makeUrl(request.path) as `/${string}`;
            }
            let httpRequest = HttpClientRequest.make(endpoint.method)(url);

            if (request?.payload instanceof FormData) {
              httpRequest = HttpClientRequest.bodyFormData(httpRequest, request.payload);
            } else if (encodePayloadBody._tag === "Some") {
              if (HttpMethod.hasBody(endpoint.method)) {
                const body = (yield* encodePayloadBody.value(
                  request?.payload,
                )) as HttpBody.HttpBody;
                httpRequest = HttpClientRequest.setBody(httpRequest, body);
              } else {
                const urlParams = (yield* encodePayloadBody.value(request?.payload)) as Record<
                  string,
                  string
                >;
                httpRequest = HttpClientRequest.setUrlParams(httpRequest, urlParams);
              }
            }

            if (encodeHeaders._tag === "Some" && request?.headers) {
              httpRequest = HttpClientRequest.setHeaders(
                httpRequest,
                (yield* encodeHeaders.value(request.headers)) as any,
              );
            }

            if (encodeUrlParams._tag === "Some" && request?.urlParams) {
              httpRequest = HttpClientRequest.appendUrlParams(
                httpRequest,
                (yield* encodeUrlParams.value(request.urlParams)) as any,
              );
            }

            const response = yield* httpClient.execute(httpRequest);

            return response;
          }).pipe(Effect.mapInputContext((input) => Context.merge(context, input)));

        options.onEndpoint({
          ...onEndpointOptions,
          endpointFn,
        });
      },
    });
  });

export const make = <
  ApiId extends string,
  Groups extends HttpApiGroup.HttpApiGroup.Any,
  ApiError,
  ApiR,
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiError, ApiR>,
  options?: {
    readonly transformClient?:
      | ((client: HttpClient.HttpClient) => HttpClient.HttpClient)
      | undefined;
    readonly baseUrl?: URL | string | undefined;
  },
): Effect.Effect<
  Simplify<UnsafeClient<Groups, ApiError>>,
  never,
  | HttpApiMiddleware.HttpApiMiddleware.Without<
      ApiR | HttpApiGroup.HttpApiGroup.ClientContext<Groups>
    >
  | HttpClient.HttpClient
> => {
  const client: Record<string, Record<string, any>> = {};
  return makeUnsafeClientInternal(api, {
    ...options,
    onGroup({ group }) {
      if (group.topLevel) return;
      client[group.identifier] = {};
    },
    onEndpoint({ endpoint, endpointFn, group }) {
      (group.topLevel ? client : (client[group.identifier] as any))[endpoint.name] = endpointFn;
    },
  }).pipe(Effect.map(() => client)) as any;
};
