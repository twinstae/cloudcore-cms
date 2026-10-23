import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

it("해시는 비밀번호를 검증하고 다른 비밀번호는 거부한다", async () => {
  const hash = await hashPassword("correct horse battery");

  expect(hash.startsWith("pbkdf2-sha256$50000$")).toBe(true);
  await expect(verifyPassword({ hash, password: "correct horse battery" })).resolves.toBe(true);
  await expect(verifyPassword({ hash, password: "wrong horse battery" })).resolves.toBe(false);
});

it("형식이 깨진 해시는 false를 돌려준다", async () => {
  await expect(verifyPassword({ hash: "", password: "x" })).resolves.toBe(false);
  await expect(verifyPassword({ hash: "plain$1$abc", password: "x" })).resolves.toBe(false);
});

it("같은 비밀번호도 salt가 달라 해시가 매번 달라진다", async () => {
  const first = await hashPassword("same password");
  const second = await hashPassword("same password");

  expect(first).not.toBe(second);
});
