import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { createDb } from "../db";
import { accounts, rateLimits, sessions, users, verifications } from "../db/schema";
import type { AppBindings } from "../types";
import { hashPassword, verifyPassword } from "./password";

/**
 * 요청마다 `env` 바인딩으로 만든다(01). 모듈 스코프 싱글톤을 두면 테스트와 미리보기에서
 * D1 연결이 섞인다.
 *
 * Better Auth의 타입은 zod 내부 타입을 끌고 오므로 밖으로 export하지 않는다. 앱은 아래의
 * `UserSession`만 안다.
 */
// 두 역할만 쓴다. 권한 판단은 앱 라우트의 가드가 하고, 플러그인은 역할 이름만 알면 된다.
const accessControl = createAccessControl({} as const);
const roles = {
  owner: accessControl.newRole({}),
  author: accessControl.newRole({}),
};

const createAuth = (env: AppBindings) => {
  const db = createDb(env.DB);

  return betterAuth({
    appName: "Cloudcore",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
        rateLimit: rateLimits,
      },
    }),
    emailAndPassword: {
      enabled: true,
      // 공개 가입은 막고, Owner 최초 설정만 서버에서 계정을 만든다.
      disableSignUp: true,
      password: { hash: hashPassword, verify: verifyPassword },
    },
    // Cloudflare가 넣는 클라이언트 IP로 rate limit 버킷을 나눈다.
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 5,
    },
    plugins: [admin({ adminRoles: ["owner"], defaultRole: "author", roles })],
  });
};

/** 앱이 아는 세션의 모양. role은 admin plugin이 넣는다. */
export type UserSession = {
  user: { id: string; email: string; name: string; role: string | null };
  session: { id: string; expiresAt: Date };
};

export const handleAuthRequest = (env: AppBindings, request: Request): Promise<Response> =>
  createAuth(env).handler(request);

export const readSession = async (
  env: AppBindings,
  headers: Headers,
): Promise<UserSession | null> => {
  const current = await createAuth(env).api.getSession({ headers });
  if (!current) return null;

  return {
    user: {
      id: current.user.id,
      email: current.user.email,
      name: current.user.name,
      role: (current.user as { role?: string | null }).role ?? null,
    },
    session: { id: current.session.id, expiresAt: current.session.expiresAt },
  };
};
