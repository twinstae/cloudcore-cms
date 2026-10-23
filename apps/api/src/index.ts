import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>().basePath("/api");

const routes = app.get("/health", (c) => c.json({ ok: true as const }));

export type AppType = typeof routes;
export default app;
