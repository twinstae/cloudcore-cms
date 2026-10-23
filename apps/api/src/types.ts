import type { Db } from "./db";

/**
 * 라우트가 `c.var`로 받는 값. 바인딩(`Env`)은 `worker-configuration.d.ts`의 전역 타입이다.
 * 미들웨어가 넣고 라우트가 읽는다: `db`는 `dbMiddleware`, 이후 `user`는 인증 미들웨어.
 */
export type AppEnv = {
  Bindings: Env;
  Variables: { db: Db };
};
