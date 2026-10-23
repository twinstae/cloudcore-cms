import { expect, it } from "vitest";
import { ApiError, client, withCookie } from "../../test/client";
import { rawRequest, signIn, signInAsNewUser } from "../../test/session";

const failure = (promise: Promise<unknown>) => promise.catch((e: unknown) => e);

const setupBody = {
  name: "Owner",
  email: "owner@example.test",
  password: "owner-password-1",
};

const postSetup = (body: unknown) =>
  rawRequest("/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

it("최초 설정은 Owner가 없을 때만 열린다", async () => {
  await expect(client.get("/api/setup")).resolves.toEqual({ required: true });

  expect((await postSetup(setupBody)).status).toBe(201);

  await expect(client.get("/api/setup")).resolves.toEqual({ required: false });
  expect((await postSetup({ ...setupBody, email: "second@example.test" })).status).toBe(409);
});

it("설정한 계정으로 로그인하고 세션에서 역할을 읽는다", async () => {
  await postSetup(setupBody);
  const cookie = await signIn(setupBody.email, setupBody.password);

  const session = await rawRequest("/api/auth/get-session", { headers: { cookie } });
  const body = (await session.json()) as { user: { email: string; role: string } };

  expect(body.user).toMatchObject({ email: setupBody.email, role: "owner" });

  const signOut = await rawRequest("/api/auth/sign-out", {
    method: "POST",
    // Better Auth는 상태를 바꾸는 요청에서 Origin을 검사한다.
    headers: { cookie, origin: "https://admin.example.test" },
  });
  expect(signOut.status).toBe(200);

  const after = await rawRequest("/api/auth/get-session", { headers: { cookie } });
  expect(await after.json()).toBeNull();
});

it("로그인하지 않으면 Tag를 만들 수 없다", async () => {
  const error = await failure(client.post("/api/tags", { name: "익명", slug: "anon" }));

  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 401, body: { error: "unauthenticated" } });
});

it("Author는 Tag를 만들 수 있지만 수정·삭제는 Owner만 한다", async () => {
  await postSetup(setupBody);
  const author = withCookie(
    await signInAsNewUser({ email: "author@example.test", role: "author" }),
  );
  const owner = withCookie(await signIn(setupBody.email, setupBody.password));

  const created = await author.post("/api/tags", { name: "작성자 태그", slug: "by-author" });

  const patchError = await failure(
    author.patch("/api/tags/:id", { id: created.id }, { name: "바뀜" }),
  );
  const deleteError = await failure(author.delete("/api/tags/:id", { id: created.id }));

  expect(patchError).toMatchObject({ status: 403, body: { error: "forbidden" } });
  expect(deleteError).toMatchObject({ status: 403, body: { error: "forbidden" } });

  const updated = await owner.patch("/api/tags/:id", { id: created.id }, { name: "Owner 수정" });
  expect(updated.name).toBe("Owner 수정");
  await owner.delete("/api/tags/:id", { id: created.id });
});
