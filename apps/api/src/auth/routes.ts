import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import * as v from "valibot";
import type { AppEnv } from "../types";
import { validate } from "../validation";
import { createCredentialUser, emailTaken, hasAnyUser } from "./store";

const SetupInput = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "이름을 입력하세요"), v.maxLength(100)),
  email: v.pipe(v.string(), v.trim(), v.email("이메일 형식이 아닙니다")),
  password: v.pipe(v.string(), v.minLength(8, "비밀번호는 8자 이상이어야 합니다")),
});

/** Owner가 한 명이라도 있으면 닫힌다. 공개 가입은 없다. */
export const setupRoutes = new Hono<AppEnv>()
  .get(
    "/",
    describeRoute({
      tags: ["setup"],
      responses: { 200: { description: "최초 설정이 필요한지" } },
    }),
    async (c) => c.json({ required: !(await hasAnyUser(c.var.db)) }),
  )
  .post(
    "/",
    describeRoute({
      tags: ["setup"],
      responses: {
        201: { description: "Owner 생성됨" },
        400: { description: "입력이 올바르지 않음" },
        409: { description: "이미 설정됨" },
      },
    }),
    validate("json", SetupInput),
    async (c) => {
      if (await hasAnyUser(c.var.db)) {
        return c.json({ error: "already_setup" as const }, 409);
      }

      const input = c.req.valid("json");
      if (await emailTaken(c.var.db, input.email)) {
        return c.json({ error: "email_taken" as const }, 409);
      }

      await createCredentialUser(c.var.db, { ...input, role: "owner" });
      return c.json({ ok: true as const }, 201);
    },
  );
