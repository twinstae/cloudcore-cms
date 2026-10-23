import { exports } from "cloudflare:workers";
import type { ExtractSchema } from "hono/types";
import type { AppType } from "../src/index";

type Schema = ExtractSchema<AppType>;
type Method = "$get" | "$post" | "$patch" | "$delete";
type PathOf<M extends Method> = {
  [P in keyof Schema]: M extends keyof Schema[P] ? P : never;
}[keyof Schema] &
  string;
type OutputOf<P extends keyof Schema, M extends Method> = Schema[P][M & keyof Schema[P]] extends {
  output: infer O;
}
  ? O
  : never;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

async function request(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await exports.default.fetch(
    new Request(`https://admin.example.test${path}`, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
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
  get: <P extends PathOf<"$get">>(path: P) => request("GET", path) as Promise<OutputOf<P, "$get">>,
};
