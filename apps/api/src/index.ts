import { Hono } from "hono";
import { handleAuthRequest } from "./auth";
import { authMiddleware } from "./auth/middleware";
import { setupRoutes } from "./auth/routes";
import { dbMiddleware } from "./db/middleware";
import { tagRoutes } from "./tags/routes";
import type { AppEnv } from "./types";

const routes = new Hono<AppEnv>()
  .basePath("/api")
  .use("*", dbMiddleware)
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ ok: true as const }))
  // Better Auth가 Web Standard Request/Response를 쓰므로 그대로 넘긴다.
  .all("/auth/*", (c) => handleAuthRequest(c.env, c.req.raw))
  .route("/setup", setupRoutes)
  .route("/tags", tagRoutes);

export type AppType = typeof routes;
export default routes;
