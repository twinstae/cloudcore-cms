import { hc } from "hono/client";
import type { AppType } from "./index";

export type { AppType };
export const createApiClient = (baseUrl: string, init?: Parameters<typeof hc>[1]) =>
  hc<AppType>(baseUrl, init);
