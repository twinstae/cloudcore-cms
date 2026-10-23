import { beforeAll, expect, it } from "vitest";
import { ApiError, withCookie } from "../../test/client";
import { signInAsNewUser } from "../../test/session";

let tags: ReturnType<typeof withCookie>;

beforeAll(async () => {
  tags = withCookie(await signInAsNewUser({ email: "owner@example.test", role: "owner" }));
});

const failure = (promise: Promise<unknown>) => promise.catch((e: unknown) => e);

it("만든 Tag가 이름순 목록에 나온다", async () => {
  const created = await tags.post("/api/tags", { name: "회고", slug: "retro" });
  await tags.post("/api/tags", { name: "개발", slug: "dev", description: "코드 이야기" });

  expect(created).toMatchObject({ name: "회고", slug: "retro", description: "" });
  expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const list = await tags.get("/api/tags");
  expect(list.map((t) => t.slug)).toEqual(["dev", "retro"]);
});

it("이미 있는 slug로 만들면 409", async () => {
  await tags.post("/api/tags", { name: "공지", slug: "notice" });

  const error = await failure(tags.post("/api/tags", { name: "공지2", slug: "notice" }));

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 409, body: { error: "slug_taken" } });
});

it("이름이 공백뿐이면 400", async () => {
  const error = await failure(tags.post("/api/tags", { name: "   ", slug: "blank" }));

  expect(error).toMatchObject({
    status: 400,
    body: { error: "invalid_input", issues: [{ path: ["name"] }] },
  });
});

it("PATCH는 준 필드만 바꾸고 updatedAt을 올린다", async () => {
  const created = await tags.post("/api/tags", {
    name: "수정 전",
    slug: "before-edit",
    description: "설명",
  });

  const updated = await tags.patch("/api/tags/:id", { id: created.id }, { name: "수정 후" });

  expect(updated).toMatchObject({
    id: created.id,
    name: "수정 후",
    slug: "before-edit",
    description: "설명",
  });
  expect(updated.createdAt).toBe(created.createdAt);
  expect(updated.updatedAt >= created.updatedAt).toBe(true);
});

it("PATCH로 이미 있는 slug를 쓰면 409", async () => {
  await tags.post("/api/tags", { name: "가", slug: "taken-a" });
  const other = await tags.post("/api/tags", { name: "나", slug: "taken-b" });

  const error = await failure(tags.patch("/api/tags/:id", { id: other.id }, { slug: "taken-a" }));

  expect(error).toMatchObject({ status: 409, body: { error: "slug_taken" } });
});

it("PATCH body가 비면 400", async () => {
  const created = await tags.post("/api/tags", { name: "빈 수정", slug: "empty-edit" });

  const error = await failure(tags.patch("/api/tags/:id", { id: created.id }, {}));

  expect(error).toMatchObject({ status: 400, body: { error: "invalid_input" } });
});

it("ULID가 아닌 id는 400", async () => {
  const error = await failure(tags.patch("/api/tags/:id", { id: "not-ulid" }, { name: "x" }));

  expect(error).toMatchObject({
    status: 400,
    body: { error: "invalid_input", issues: [{ path: ["id"] }] },
  });
});

it("없는 Tag를 PATCH하거나 DELETE하면 404", async () => {
  const missing = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

  const patchError = await failure(tags.patch("/api/tags/:id", { id: missing }, { name: "x" }));
  const deleteError = await failure(tags.delete("/api/tags/:id", { id: missing }));

  expect(patchError).toMatchObject({ status: 404, body: { error: "tag_not_found" } });
  expect(deleteError).toMatchObject({ status: 404, body: { error: "tag_not_found" } });
});

it("DELETE하면 목록에서 사라지고 같은 id를 다시 지우면 404", async () => {
  const created = await tags.post("/api/tags", { name: "지울 태그", slug: "delete-me" });

  const deleted = await tags.delete("/api/tags/:id", { id: created.id });
  expect(deleted).toBeUndefined();

  const list = await tags.get("/api/tags");
  expect(list.map((t) => t.slug)).not.toContain("delete-me");

  const error = await failure(tags.delete("/api/tags/:id", { id: created.id }));
  expect(error).toMatchObject({ status: 404 });
});

it("잘못된 slug는 400이고 입력을 되돌려 주지 않는다", async () => {
  const error = await failure(tags.post("/api/tags", { name: "x", slug: "Not A Slug" }));

  expect(error).toMatchObject({
    status: 400,
    body: { error: "invalid_input", issues: [{ path: ["slug"] }] },
  });
  expect(JSON.stringify((error as ApiError).body)).not.toContain("Not A Slug");
});
