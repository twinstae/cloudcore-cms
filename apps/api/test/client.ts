import { exports } from "cloudflare:workers";
import type { ExtractSchema } from "hono/types";
import type { AppType } from "../src/index";

type Schema = ExtractSchema<AppType>;
type Method = "$get" | "$post" | "$patch" | "$delete";
type PathOf<M extends Method> = {
  [P in keyof Schema]: M extends keyof Schema[P] ? P : never;
}[keyof Schema] &
  string;
type Endpoint<P extends keyof Schema, M extends Method> = Schema[P][M & keyof Schema[P]];
// 성공(2xx) 응답의 body 타입만 고른다. 실패는 ApiError로 던지므로 타입에 넣지 않는다.
type OutputOf<P extends keyof Schema, M extends Method> =
  Endpoint<P, M> extends infer E
    ? E extends { output: infer O; status: infer S }
      ? S extends 200 | 201 | 204
        ? O
        : never
      : never
    : never;
type InputOf<P extends keyof Schema, M extends Method> =
  Endpoint<P, M> extends { input: { json: infer J } } ? J : never;

// "/api/tags/:id" → { id: string }
type ParamNames<P extends string> = P extends `${string}:${infer Name}/${infer Rest}`
  ? Name | ParamNames<`/${Rest}`>
  : P extends `${string}:${infer Name}`
    ? Name
    : never;
type ParamsOf<P extends string> = { [K in ParamNames<P>]: string };

const fillPath = <P extends string>(template: P, params: ParamsOf<P>): string =>
  template.replace(/:([^/]+)/g, (_, name: string) => {
    const value = (params as Record<string, string>)[name];
    if (value === undefined) throw new Error(`경로 파라미터가 없습니다: ${name}`);
    return encodeURIComponent(value);
  });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

/** 로그인 세션을 넘길 때 쓴다: `client.post(path, body, { cookie })`. */
export type RequestOptions = { cookie?: string };

async function request(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  if (options.cookie) headers["cookie"] = options.cookie;

  const res = await exports.default.fetch(
    new Request(`https://admin.example.test${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  );
  const data: unknown = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : await res.text();
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// API 테스트용 클라이언트. 2xx면 파싱한 body를, 아니면 ApiError(status, body)를 던진다.
export const client = {
  get: <P extends PathOf<"$get">>(path: P, options?: RequestOptions) =>
    request("GET", path, undefined, options) as Promise<OutputOf<P, "$get">>,
  post: <P extends PathOf<"$post">>(path: P, body: InputOf<P, "$post">, options?: RequestOptions) =>
    request("POST", path, body, options) as Promise<OutputOf<P, "$post">>,
  patch: <P extends PathOf<"$patch">>(
    path: P,
    params: ParamsOf<P>,
    body: InputOf<P, "$patch">,
    options?: RequestOptions,
  ) => request("PATCH", fillPath(path, params), body, options) as Promise<OutputOf<P, "$patch">>,
  delete: <P extends PathOf<"$delete">>(path: P, params: ParamsOf<P>, options?: RequestOptions) =>
    request("DELETE", fillPath(path, params), undefined, options).then(() => undefined),
};

/** 로그인 세션으로 호출하는 클라이언트. 테스트마다 cookie를 넘기지 않게 한다. */
export const withCookie = (cookie: string) => ({
  get: <P extends PathOf<"$get">>(path: P) => client.get(path, { cookie }),
  post: <P extends PathOf<"$post">>(path: P, body: InputOf<P, "$post">) =>
    client.post(path, body, { cookie }),
  patch: <P extends PathOf<"$patch">>(path: P, params: ParamsOf<P>, body: InputOf<P, "$patch">) =>
    client.patch(path, params, body, { cookie }),
  delete: <P extends PathOf<"$delete">>(path: P, params: ParamsOf<P>) =>
    client.delete(path, params, { cookie }),
});
