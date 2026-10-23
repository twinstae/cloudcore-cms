import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { accounts, users } from "../db/schema";
import { hashPassword } from "./password";

export const hasAnyUser = async (db: Db): Promise<boolean> => {
  const [row] = await db.select({ id: users.id }).from(users).limit(1);
  return row !== undefined;
};

/**
 * Better Auth의 credential 계정을 직접 만든다. 공개 가입이 막혀 있어 최초 Owner는
 * 가입 API를 거치지 않는다. 이후 로그인은 Better Auth가 이 해시를 검증한다.
 */
export const createCredentialUser = async (
  db: Db,
  input: { name: string; email: string; password: string; role: "owner" | "author" },
): Promise<string> => {
  const now = new Date();
  const id = crypto.randomUUID().replaceAll("-", "");

  await db.batch([
    db.insert(users).values({
      id,
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(accounts).values({
      id: crypto.randomUUID().replaceAll("-", ""),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(input.password),
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  return id;
};

export const emailTaken = async (db: Db, email: string): Promise<boolean> => {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row !== undefined;
};
