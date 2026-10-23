import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";
import { readSession } from ".";

/** 세션을 읽어 `c.var.session`에 둔다. 비로그인이면 null. */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("session", await readSession(c.env, c.req.raw.headers));
  await next();
});

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.var.session) return c.json({ error: "unauthenticated" as const }, 401);
  await next();
});

/** Owner는 한 명이라는 규칙은 앱 레이어에서 지킨다(01). */
export const requireOwner = createMiddleware<AppEnv>(async (c, next) => {
  if (c.var.session?.user.role !== "owner") {
    return c.json({ error: "forbidden" as const }, 403);
  }
  await next();
});
