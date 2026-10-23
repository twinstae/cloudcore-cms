import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";
import { createDb } from ".";

/** 요청마다 D1 연결을 만들어 `c.var.db`에 둔다. 라우트는 `store(c.var.db)`만 합성한다. */
export const dbMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});
