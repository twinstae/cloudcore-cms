import { expect, it } from "vitest";
import { ApiError, client } from "../../test/client";

const failure = (promise: Promise<unknown>) => promise.catch((e: unknown) => e);

it("만든 Tag가 이름순 목록에 나온다", async () => {
  const created = await client.post("/api/tags", { name: "회고", slug: "retro" });
  await client.post("/api/tags", { name: "개발", slug: "dev", description: "코드 이야기" });

  expect(created).toMatchObject({ name: "회고", slug: "retro", description: "" });
  expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const tags = await client.get("/api/tags");
  expect(tags.map((t) => t.slug)).toEqual(["dev", "retro"]);
});

it("이미 있는 slug로 만들면 409", async () => {
  await client.post("/api/tags", { name: "공지", slug: "notice" });

  const error = await failure(client.post("/api/tags", { name: "공지2", slug: "notice" }));

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 409, body: { error: "slug_taken" } });
});

it("이름이 공백뿐이면 400", async () => {
  const error = await failure(client.post("/api/tags", { name: "   ", slug: "blank" }));

  expect(error).toMatchObject({
    status: 400,
    body: { error: "invalid_input", issues: [{ path: ["name"] }] },
  });
});

it("잘못된 slug는 400이고 입력을 되돌려 주지 않는다", async () => {
  const error = await failure(client.post("/api/tags", { name: "x", slug: "Not A Slug" }));

  expect(error).toMatchObject({
    status: 400,
    body: { error: "invalid_input", issues: [{ path: ["slug"] }] },
  });
  expect(JSON.stringify((error as ApiError).body)).not.toContain("Not A Slug");
});
