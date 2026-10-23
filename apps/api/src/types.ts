import type { UserSession } from "./auth";
import type { Db } from "./db";

/**
 * `Env`는 `worker-configuration.d.ts`가 wrangler 설정에서 만든다. 비밀값은 배포 때
 * `wrangler secret put`으로 넣으므로 설정 파일에 없어 타입에 직접 더한다.
 */
export type AppBindings = Env & { BETTER_AUTH_SECRET?: string };

/**
 * 라우트가 `c.var`로 받는 값. 미들웨어가 넣고 라우트가 읽는다:
 * `db`는 `dbMiddleware`, `session`은 `authMiddleware`.
 */
export type AppEnv = {
  Bindings: AppBindings;
  Variables: { db: Db; session: UserSession | null };
};
