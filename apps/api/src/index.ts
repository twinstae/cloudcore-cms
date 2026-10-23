import { Hono } from "hono";
import { dbMiddleware } from "./db/middleware";
import { tagRoutes } from "./tags/routes";
import type { AppEnv } from "./types";

const routes = new Hono<AppEnv>()
  .basePath("/api")
  .use("*", dbMiddleware)
  .get("/health", (c) => c.json({ ok: true as const }))
  .route("/tags", tagRoutes);

export type AppType = typeof routes;
export default routes;
