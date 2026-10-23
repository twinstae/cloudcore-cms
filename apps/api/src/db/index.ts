import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const createDb = (d1: D1Database) => drizzle(d1, { schema });
export type Db = ReturnType<typeof createDb>;

/** D1(SQLite) UNIQUE 제약 위반인지. drizzle은 원래 에러를 cause에 담는다. */
export const isUniqueViolation = (error: unknown): boolean => {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if (e.message.includes("UNIQUE constraint failed")) return true;
  }
  return false;
};
