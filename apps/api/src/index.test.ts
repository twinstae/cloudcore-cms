import { expect, it } from "vitest";
import { ApiError, client } from "../test/client";

it("GET /api/health는 ok를 돌려준다", async () => {
  const data = await client.get("/api/health");

  expect(data).toEqual({ ok: true });
});

it("없는 API 경로는 404", async () => {
  // @ts-expect-error 스키마에 없는 경로
  const error = await client.get("/api/nope").catch((e: unknown) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 404 });
});
