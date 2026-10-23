# Better Auth on Cloudflare Workers + D1 (Hono, Drizzle)

- 티켓: `.scratch/cms-rewrite/issues/01-research-better-auth-on-workers-d1.md`
- 조사일: 2026-10-23
- 기준 버전: `better-auth@1.7.12` (npm `latest`, 2026-10-22 게시), `@better-auth/passkey@1.7.12`, `@better-auth/drizzle-adapter@1.7.12`, `@better-auth/utils@0.5.0`, CLI `auth@1.7.12`. 참고용 `drizzle-orm@0.45.4`, `hono@4.13.13`
- 방법: npm tarball 소스(`dist/*.mjs`, `@better-auth/core/src`)를 직접 읽음. 공식 문서(better-auth GitHub `docs/content/docs/**`, Cloudflare developers docs, workerd 소스)도 확인함. 로컬 벤치마크와 번들 측정도 함.
- 표기: **[소스]**는 패키지 소스에서 직접 확인한 것, **[문서]**는 공식 문서, **[측정]**은 이번에 로컬에서 잰 값, **[미검증]**은 추론이거나 실제 Workers에서 확인하지 못한 것.

---

## 0. 요약 (결정에 필요한 사실)

1. Workers + D1 + Drizzle 조합은 공식 지원된다. 필요한 것은 `nodejs_compat` 플래그(AsyncLocalStorage, `node:crypto` 때문)뿐이다.
2. **무료 플랜 10ms CPU 안에서는 기본 비밀번호 해싱이 불가능하다.** 기본값은 scrypt(N=16384, r=16, p=1, dkLen=64)이고, 로컬 네이티브 측정으로 해시 1회에 약 70ms가 든다. 로그인, 초대 수락, 비밀번호 재설정 요청마다 이 비용이 든다. **Workers Paid($5/월, 기본 30s CPU)를 쓰거나 해시 함수를 바꿔야 한다.**
3. 요청마다 인스턴스를 만들 필요는 없다. `import { env } from "cloudflare:workers"`로 모듈 스코프 싱글톤을 만드는 것이 현재 공식 문서의 패턴이고, CPU 측면에서도 유리하다.
4. 같은 origin(`admin.example.com`)이면 쿠키 설정을 따로 할 필요가 거의 없다. 기본값이 `HttpOnly; SameSite=Lax; Path=/`이고 https에서는 `Secure`와 `__Secure-` 접두사가 붙는다. CORS와 `crossSubDomainCookies`는 필요 없다.
5. passkey는 별도 패키지 `@better-auth/passkey`로 제공된다. 기본 설정에서는 로그인한 **fresh session**에서만 등록할 수 있다.
6. **초대 전용 가입은 내장 기능으로 되지 않는다.** `emailAndPassword.disableSignUp: true`는 서버 호출(`auth.api.signUpEmail`)까지 막는다. organization 초대는 이미 가입한 사용자용이다. 그래서 **Invitation 테이블과 수락 엔드포인트는 직접 구현**하고, 계정은 admin plugin의 `auth.api.createUser`를 서버에서 호출해 만드는 방식이 가장 깔끔하다.
7. **Owner가 발급하는 비밀번호 재설정 링크**는 Better Auth의 `verification` 테이블 형식(`reset-password:<token>` → userId)에 맞춰 토큰을 직접 넣으면 된다. 소비는 내장 `POST /reset-password`가 처리한다. 대안으로 admin plugin `setUserPassword`(Owner가 직접 새 비밀번호 지정)도 있다.
8. Owner/Author는 admin plugin `role` 필드(`"owner"`, `"author"`)로 표현한다. `adminRoles: ["owner"]`, `defaultRole: "author"`로 설정하고, 쓰지 않는 admin 엔드포인트는 `disabledPaths`로 끈다.
9. 스키마는 `npx auth@latest generate`로 Drizzle 스키마 파일을 만들고 `drizzle-kit generate`로 SQL을 만든 뒤 `wrangler d1 migrations apply`로 적용한다. Better Auth CLI는 D1에 직접 접속할 수 없다.
10. OpenAPI: `openAPI()` plugin이 `/api/auth/open-api/generate-schema`(OpenAPI 3.1.1 JSON)를 제공한다. Scalar의 `sources`에 두 번째 소스로 넣는 방식이 공식 문서에 있다. 단, Better Auth 엔드포인트는 Hono RPC(`hc`) 타입에 포함되지 않으므로 Admin에서는 `better-auth/client`를 따로 쓴다.

---

## 1. 지원 상태와 제약

### 1.1 런타임 요구사항

- Hono 통합 문서에 "Better Auth uses `AsyncLocalStorage`. Add the `nodejs_compat` compatibility flag"라고 적혀 있다. **[문서]** https://github.com/better-auth/better-auth/blob/main/docs/content/docs/integrations/hono.mdx
- 마운트 방법: `app.on(["GET","POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))`. 기본 `basePath`는 `/api/auth`이다. **[문서]** 같은 파일
- `@better-auth/drizzle-adapter`의 peer는 `drizzle-orm ^0.45.2 || >=1.0.0-rc.1 <2.0.0`이다. 소스에 D1의 `meta.changes`를 정규화하는 코드가 있다(D1을 명시적으로 고려함). **[소스]** `@better-auth/drizzle-adapter/dist/index.mjs`
- `transaction` 옵션의 기본값은 `false`이다. 즉 D1이 지원하지 않는 interactive transaction을 기본으로 쓰지 않는다. `db.transaction`은 `provider: "mysql"` 분기에서만 호출된다. **[소스]** 같은 파일 L563
- `provider: "sqlite"`일 때 `supportsJSON`, `supportsArrays`, `supportsUUIDs`는 모두 false이다. Better Auth가 직렬화를 맡는다. **[소스]**

### 1.2 crypto와 비밀번호 해싱 (가장 중요한 제약)

- `better-auth/dist/crypto/password.mjs`는 `@better-auth/utils/password`를 쓴다. 이 패키지의 `exports["./password"]`는 **`workerd` 조건일 때 `password.node.mjs`(`node:crypto`의 `scrypt`)**를 고르고, 그 밖의 런타임에서는 `@noble/hashes`의 순수 JS scrypt를 쓴다. **[소스]** `@better-auth/utils@0.5.0/package.json`, `dist/password.node.mjs`
- 파라미터: `N: 16384, r: 16, p: 1, dkLen: 64`, `maxmem = 128*N*r*2`(약 64MB 상한, 실제 사용은 약 32MB). 저장 형식은 `salt:hexkey`. **[소스]**
- Cloudflare 문서에 따르면 `node:crypto`는 argon2를 제외하고 지원된다(scrypt 포함). **[문서]** https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
- workerd에는 scrypt cost와 PBKDF2 반복 횟수에 런타임 상한이 있다(`checkScryptLimits`, `checkPbkdfLimits`). 프로덕션의 실제 상한값은 오픈소스 코드에 없다. **[소스]** https://github.com/cloudflare/workerd/blob/main/src/workerd/api/crypto/impl.c++ . 흔히 PBKDF2 상한이 100,000이라고 알려져 있지만 **[미검증]**이다.
- **[측정]** Node v24 네이티브(OpenSSL), 12코어 데스크톱, 10회 평균:
  | 알고리즘 | 1회 |
  |---|---|
  | scrypt N=16384 r=16 (Better Auth 기본) | **69.8 ms** |
  | scrypt N=16384 r=8 | 27.2 ms |
  | PBKDF2-SHA256 100k | 11.8 ms |
  | PBKDF2-SHA256 10k | 1.2 ms |

  workerd(BoringSSL)와 Cloudflare 엣지 CPU에서는 수치가 다를 수 있다 **[미검증]**. 그래도 크기 차이가 커서 결론은 바뀌지 않는다.
- Cloudflare 한도: Free는 **HTTP 요청당 CPU 10ms**, Paid는 기본 30s(최대 5분, `limits.cpu_ms`)이다. Free에서도 "occasionally"하게 넘는 것은 허용되지만 계속 넘으면 Error 1102로 종료된다. 문서에는 "authentication ... typically use 10-20 ms"라고 적혀 있다. **[문서]** https://developers.cloudflare.com/workers/platform/limits/
- **결론**: 무료 플랜에서 기본 scrypt를 쓰면 로그인할 때마다 한도를 7배쯤 넘는다. 선택지는 다음과 같다.
  1. **Workers Paid**를 쓴다. 가장 단순하고 보안 파라미터를 낮추지 않아도 된다. (권장)
  2. `emailAndPassword.password: { hash, verify }`로 해시 함수를 바꾼다. 예: WebCrypto PBKDF2. 다만 10ms 안에 들어가려면 반복 횟수를 OWASP 권고(PBKDF2-SHA256 600k)보다 훨씬 낮춰야 해서 보안이 약해진다.
  3. 해싱만 별도 Worker(Paid)로 분리하고 service binding으로 호출한다. 커뮤니티 사례가 있다(https://news.hada.io/topic?id=27399). **[미검증]** 결국 Paid가 필요하므로 1번보다 나은 점이 없다.
  - passkey 로그인은 scrypt를 쓰지 않는다(서명 검증만 함). 하지만 비밀번호 로그인, 초대 수락, 재설정은 여전히 해시가 필요하다.
- 서명 쿠키, 토큰 생성 등 나머지는 WebCrypto와 `@noble/*`로 처리되며 가볍다. **[소스]** 의존성 목록: `jose`, `@noble/hashes`, `@noble/ciphers`

### 1.3 번들 크기

- **[측정]** Hono, `betterAuth` + `drizzleAdapter` + `admin()` + `passkey()` + `openAPI()`로 구성한 최소 Worker를 esbuild로 minify하면(`conditions=workerd,worker,browser`) **1.26 MB, gzip 330 KB**이다. 큰 순서는 better-auth 256KB, kysely 185KB(adapter가 drizzle이어도 포함됨), @better-auth/core 124KB, zod 101KB, drizzle-orm 63KB, @simplewebauthn/server 60KB, asn1js 58KB, @peculiar/x509 47KB, jose 43KB이다.
- 현재 한도는 Free와 Paid 모두 **비압축 64 MiB**이고 압축 한도는 없다. **[문서]** limits 페이지. 따라서 크기는 문제가 아니다. 다만 startup CPU 한도(`Script startup exceeded CPU time limit`)는 실제 배포에서 확인해야 한다 **[미검증]**.
- 참고: Better Auth는 내부에서 **zod v4**를 쓴다. 프로젝트 스키마는 valibot이므로 번들에 스키마 라이브러리 두 개가 들어간다(약 100KB 추가). 기능 문제는 아니다.

---

## 2. 인스턴스 생성 패턴 (`env` 바인딩)

- **현재 공식 패턴은 모듈 스코프다.** Better Auth의 database 문서(D1 예제)는 다음처럼 쓴다. **[문서]** https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/database.mdx
  ```ts
  import { env } from "cloudflare:workers";
  export const auth = betterAuth({ database: env.DB, /* ... */ });
  ```
- Cloudflare 문서: `cloudflare:workers`의 `env`는 top-level에서 읽을 수 있다(secret, 변수, 클라이언트 초기화). 다만 **I/O(예: `env.KV.get`)는 요청 컨텍스트 안에서만** 할 수 있다. **[문서]** https://developers.cloudflare.com/workers/runtime-apis/bindings/
- `betterAuth()`와 `drizzle(env.DB)`는 생성할 때 I/O를 하지 않으므로 모듈 스코프에서 만들어도 된다 **[소스, 추론]**. 이렇게 하면 isolate당 한 번만 초기화되어 요청마다 드는 CPU를 아낄 수 있다(무료 플랜이면 특히 중요함).
- 요청마다 만드는 패턴(`createAuth(c.env)`)도 동작하지만, 플러그인과 스키마 초기화 비용이 매 요청 반복된다. 꼭 그렇게 해야 한다면 isolate 단위로 memoize한다. **[추론]**
- 권장 구성:
  ```ts
  // apps/api/src/auth.ts
  import { env } from "cloudflare:workers";
  import { drizzle } from "drizzle-orm/d1";
  import { betterAuth } from "better-auth";
  import { drizzleAdapter } from "better-auth/adapters/drizzle";
  import { admin, openAPI } from "better-auth/plugins";
  import { passkey } from "@better-auth/passkey";
  import * as schema from "./db/schema";

  export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,          // https://admin.example.com
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(drizzle(env.DB, { schema }), { provider: "sqlite", schema }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    plugins: [
      admin({ adminRoles: ["owner"], defaultRole: "author" }),
      passkey({ rpID: "admin.example.com", rpName: "Cloudcore" }),
      openAPI({ disableDefaultReference: true }),
    ],
    advanced: { backgroundTasks: { handler: (p) => /* ctx.waitUntil */ p } },
  });
  ```
  `advanced.backgroundTasks.handler`에 `waitUntil`을 연결하는 옵션이 있다. **[소스]** `@better-auth/core/src/types/init-options.ts` L514-524. `waitUntil`은 요청 컨텍스트에 있으므로 모듈 스코프에서 연결하는 방법은 구현할 때 확인해야 한다 **[미검증]**.
- 테스트(`@cloudflare/vitest-pool-workers`)에서도 `cloudflare:workers`의 `env`를 쓸 수 있다 **[미검증, Cloudflare 문서상 지원]**.

---

## 3. 같은 origin 세션 쿠키

- 기본 쿠키(**[소스]** `better-auth/dist/cookies/index.mjs`):
  - 이름은 `${cookiePrefix||"better-auth"}.session_token`이다. https이면 `__Secure-` 접두사가 붙는다.
  - `httpOnly: true`, `sameSite: "lax"`, `path: "/"`이며 `secure`는 https일 때 켜진다.
  - `session_token`의 maxAge는 `session.expiresIn`(기본 7일)이고, `session_data`(cookieCache)는 기본 300초다.
  - `domain`은 `advanced.crossSubDomainCookies.enabled`일 때만 설정된다. 기본값은 host-only이다.
- `admin.example.com` 한 곳에서 API와 Admin SPA를 같이 서빙하면:
  - CORS, `trustedOrigins` 추가, `crossSubDomainCookies` 모두 **필요 없다**. `baseURL`만 `https://admin.example.com`으로 정확히 설정하면 된다.
  - 쿠키가 host-only라서 `example.com`(Site)으로는 전송되지 않는다. Site는 service binding으로 공개 데이터만 받으므로 문제없다. 나중에 Site에서 draft 미리보기를 해야 하면 그때 다시 검토한다.
  - `advanced.cookiePrefix: "cc"`처럼 이름만 바꿀 수 있다.
- 로컬 개발(http://localhost)에서는 `secure`가 자동으로 꺼진다(`useSecureCookies`로 강제할 수 있음).
- D1 조회를 줄이려면 `session.cookieCache: { enabled: true, maxAge: 300 }`을 쓴다. 대신 role 변경이나 세션 폐기가 최대 maxAge만큼 늦게 반영된다. **[소스]** 옵션 존재 확인

---

## 4. passkey plugin

- 패키지: `@better-auth/passkey@1.7.12`(서버 `passkey`, 클라이언트 `@better-auth/passkey/client`의 `passkeyClient`). 의존성은 `@simplewebauthn/server@^13.3.1`, `@simplewebauthn/browser@^13.3.0`. **[소스]** package.json
- 엔드포인트(**[소스]** `dist/index.mjs`): `/passkey/generate-register-options`, `/passkey/verify-registration`, `/passkey/generate-authenticate-options`, `/passkey/verify-authentication`, `/passkey/list-user-passkeys`, `/passkey/delete-passkey`, `/passkey/update-passkey`. `passkey` 테이블이 스키마에 추가된다.
- 옵션:
  - `rpID`: 기본값은 `baseURL`의 hostname이다. `admin.example.com`이면 자동으로 맞는다.
  - `rpName`: 기본값은 `appName`이다.
  - `origin`: 기본값은 null이며, 이때 요청의 `Origin` 헤더를 기대 origin으로 쓴다. 명시하는 편이 안전하다.
  - challenge는 `better-auth-passkey` 쿠키에 저장되고 maxAge는 300초다.
- **등록에는 기본으로 fresh session이 필요하다**(`registration.requireSession` 기본값 true, `freshSessionMiddleware`). 세션 생성 후 `session.freshAge`(기본 1일)가 지나면 `SESSION_NOT_FRESH`(403)가 난다. **[소스]** `api/routes/session.mjs` L331
- `registration.requireSession: false`와 `registration.resolveUser({ ctx, context })`를 쓰면 세션 없이도 등록할 수 있다. `context` 쿼리 문자열이 넘어오므로, 이것으로 **초대 토큰을 받아 비밀번호 없이 passkey만으로 가입하는 흐름**도 만들 수 있다 **[소스, 흐름 자체는 미검증]**. 단, 사용자 row는 미리 있어야 한다(`resolveUser`는 id와 name을 돌려줄 뿐 사용자를 만들지 않는다).
- 권장 흐름: 초대 수락(이메일과 비밀번호) → 자동 로그인 → 설정 화면에서 passkey 추가(fresh session 조건을 만족함) → 이후 passkey로 로그인.
- Workers 호환성: `@simplewebauthn/server` v13은 WebCrypto 기반이고 번들이 정상적으로 만들어졌다 **[측정]**. 실제 엣지 동작은 **[미검증]**이다.

---

## 5. 초대 링크로만 가입

### 5.1 내장 기능으로 되는지

| 후보 | 결과 | 근거 |
|---|---|---|
| `emailAndPassword.disableSignUp: true` | 공개 가입은 막힌다. 하지만 **서버 호출 `auth.api.signUpEmail`도 같이 막힌다**(분기 조건에 server-call 예외가 없음). | **[소스]** `api/routes/sign-up.mjs` L145 |
| organization plugin invitation | `acceptInvitation`에 `orgSessionMiddleware`가 걸려 있다. 즉 **이미 가입하고 로그인한 사용자**가 조직에 들어가는 용도다. 가입 자체는 해결하지 못하고, 조직 개념이 덤으로 들어온다. | **[소스]** `plugins/organization/routes/crud-invites.mjs` L250 |
| admin plugin `createUser` | 세션이 있으면 `user:create` 권한을 검사한다. **요청이나 헤더 없이 서버에서 호출하면(`auth.api.createUser({ body })`) 인증 없이 통과**한다. `password`를 주면 scrypt 해시를 만들어 credential account도 함께 만든다. `role`도 지정할 수 있다. | **[소스]** `plugins/admin/routes.mjs` L134-232 |
| magic-link, email-otp | 메일 발송이 전제이고 범위 밖(Out of scope)이다. | |

→ 초대 전용 가입 플러그인은 없다. **Invitation은 직접 구현**한다.

### 5.2 권장 구현

1. `cc_invitation` 테이블(앱 소유, Drizzle): `id`(ULID), `tokenHash`, `email`(선택), `role`(`author`), `createdBy`, `expiresAt`, `usedAt`. 토큰은 해시만 저장한다.
2. Owner 전용 엔드포인트 `POST /api/v1/invitations`에서 토큰을 발급하고 `https://admin.example.com/invite/<token>`을 응답한다. Owner가 이 링크를 복사해서 전달한다.
3. 공개 엔드포인트 `POST /api/v1/invitations/:token/accept`에 `{ name, email, password }`를 받는다.
   - 토큰 검증(존재, 만료, 미사용)을 하고 `usedAt`을 원자적으로 기록한다(`UPDATE ... WHERE used_at IS NULL`의 영향 행 수로 판단).
   - `await auth.api.createUser({ body: { email, password, name, role: "author" } })`를 **headers 없이** 호출한다.
   - 곧바로 `auth.api.signInEmail({ body: { email, password }, headers: c.req.raw.headers, asResponse: true })`로 세션 쿠키를 받아 응답에 붙인다. 이 경로에서 scrypt가 두 번 돈다(해시 1회, 검증 1회).
4. 공개 `/api/auth/admin/create-user` 엔드포인트는 Owner 세션만 통과한다. 그래도 노출할 필요가 없으므로 `disabledPaths`에 넣는 것을 고려한다. `disabledPaths`에 넣으면 HTTP로는 막히지만 `auth.api.createUser` 서버 호출은 그대로 된다 **[미검증: disabledPaths가 서버 호출에는 영향을 주지 않는다는 점은 구현할 때 테스트로 확인]**.
- 대안: admin plugin 없이 `(await auth.$context).internalAdapter.createUser(...)`, `password.hash`, `linkAccount`를 직접 쓰는 방법도 있다. 하지만 internal API라서 버전이 바뀔 때 깨질 위험이 있다.
- 대안: `databaseHooks.user.create.before`에서 초대 토큰을 검사하고 `disableSignUp`은 끄는 방법도 있다. 하지만 hook에서는 요청 body의 토큰을 다루기 어렵고 공개 가입 엔드포인트가 열려 있게 되므로 권하지 않는다. **[추론]**

---

## 6. Owner가 비밀번호 재설정 링크 발급 (메일 없음)

- 내장 흐름(**[소스]** `api/routes/password.mjs`):
  - `POST /request-password-reset {email}`은 `verification` 테이블에 `identifier: "reset-password:<token>"`, `value: userId`, `expiresAt`(기본 3600초, `resetPasswordTokenExpiresIn`)을 저장한 뒤 `sendResetPassword({ user, url, token })` 콜백을 호출한다. 콜백이 없으면 `RESET_PASSWORD_DISABLED`가 난다.
  - `POST /reset-password {newPassword, token}`은 토큰을 찾고 만료를 확인한 뒤 해시를 만들고 `consumeVerificationValue`로 1회 사용 처리를 한다. 이후 `onPasswordReset` 훅을 호출하고, 옵션에 따라 기존 세션을 폐기한다(`revokeSessionsOnPasswordReset`).
- **권장**: Owner 전용 앱 엔드포인트 `POST /api/v1/users/:id/password-reset-link`를 만든다.
  - 서버에서 `(await auth.$context).internalAdapter.createVerificationValue({ identifier: \`reset-password:${token}\`, value: userId, expiresAt })`를 직접 호출하고, 링크 `https://admin.example.com/reset-password?token=<token>`을 돌려준다.
  - Admin의 재설정 화면은 내장 `authClient.resetPassword({ newPassword, token })`를 그대로 쓴다.
  - `verification.storeIdentifier` 옵션(해시 저장)이 있으므로 internalAdapter를 통해 넣어야 형식이 맞는다. raw SQL로 넣으면 안 된다. **[소스]** `db/internal-adapter.mjs` L717
- 다른 방법:
  - (a) `sendResetPassword` 콜백을 메일 없이 두고, Owner 엔드포인트에서 `auth.api.requestPasswordReset({ body: { email } })`을 호출해 콜백 클로저로 `url`을 가로챈다. 공개 `/request-password-reset`이 열려 있게 되므로 `disabledPaths`로 막아야 한다. 동작은 하지만 우회적이다.
  - (b) admin plugin `POST /admin/set-user-password {userId, newPassword}`: Owner가 임시 비밀번호를 정해서 전달한다. 링크가 필요 없고 내장 기능이다. 단, 비밀번호를 Owner가 알게 된다.

---

## 7. Owner/Author 역할 표현

- admin plugin이 `user` 테이블에 `role`, `banned`, `banReason`, `banExpires` 컬럼을, `session` 테이블에 `impersonatedBy` 컬럼을 추가한다 **[소스]** `plugins/admin/schema.mjs`.
- 설정: `admin({ adminRoles: ["owner"], defaultRole: "author" })`. 세밀한 권한이 필요하면 `createAccessControl`과 `roles`를 쓴다(`better-auth/plugins/admin/access`).
  - 단, Content, Tag, Media 권한(예: "Author는 Post만", "Tag 삭제는 Owner만")은 **앱 도메인 규칙이므로 Hono 미들웨어와 서비스 레이어에서 `session.user.role`로 판단**하는 편이 단순하다. Better Auth의 access control은 admin 엔드포인트용이다. **[추론]**
- "Owner는 단 한 명"이라는 불변식은 Better Auth가 보장하지 않으므로 앱에서 지킨다(예: role 변경 엔드포인트 비활성화, bootstrap에서만 owner 생성).
- 필요 없는 엔드포인트(impersonate, ban, set-role 등)는 `disabledPaths: ["/admin/impersonate-user", ...]`로 끈다(`disabledPaths` 옵션 존재 확인, OpenAPI 생성에서도 제외됨). **[소스]** `init-options.ts` L1810, `open-api/generator.mjs`
- admin plugin을 쓰지 않으려면 `user.additionalFields.role = { type: "string", input: false, defaultValue: "author" }`로 표현할 수도 있다. 그러면 5장과 6장에서 `createUser`와 `setUserPassword`를 직접 구현해야 한다.

---

## 8. Drizzle 스키마 생성과 D1 migration 흐름

- CLI 패키지가 바뀌었다. **`@better-auth/cli`는 npm에서 deprecated**("Package no longer supported", 마지막 1.4.22)이고, 현재 CLI는 **`auth` 패키지**(`npx auth@latest`, bin `auth`/`better-auth`, 1.7.12)이다. **[소스]** `npm view`, **[문서]** https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/cli.mdx
  - 명령: `generate`, `migrate`, `init`, `info`, `check`, `create-admin`, `secret`, `upgrade`, `mcp` 등. `generate`에는 `--config`, `--output` 옵션이 있다.
- **CLI는 D1에 직접 접속할 수 없다.** 문서에 "Cloudflare D1 can only be queried through a Cloudflare Worker, so the CLI cannot access it directly"라고 되어 있고, 대안으로 Worker 안에서 `getMigrations(auth.options)`를 쓰는 `/migrate` 엔드포인트를 예시로 든다. **[문서]** database.mdx. 따라서 `auth migrate`와 `auth create-admin`은 D1에 쓸 수 없다고 보는 것이 맞다 **[추론]**.
- 권장 흐름(Drizzle 소유):
  1. CLI 전용 config 파일(예: `apps/api/better-auth.config.ts`)을 따로 둔다. 같은 plugin 구성에 `drizzleAdapter({} as any, { provider: "sqlite" })`처럼 더미 DB를 넣는다. `cloudflare:workers` import는 Node CLI에서 해석되지 않기 때문이다 **[추론, 구현 시 확인]**.
  2. `npx auth@latest generate --config <file> --output src/db/auth-schema.ts`로 Drizzle 테이블(`user`, `session`, `account`, `verification`, `passkey` + admin 컬럼)을 생성한다.
  3. `drizzle-kit generate`(dialect `sqlite`, driver `d1-http` 또는 out 폴더만 지정)로 SQL migration을 만든다.
  4. `wrangler d1 migrations apply <DB> --local` 또는 `--remote`로 적용한다. 테스트에서는 `@cloudflare/vitest-pool-workers`의 `applyD1Migrations`를 쓴다.
- 테이블 이름: 기본은 단수(`user`, `session` …)이다. `cc_` 접두사 규칙을 맞추려면 `user: { modelName: "cc_user" }`처럼 지정하거나 생성된 Drizzle 테이블 이름을 바꾸고 `drizzleAdapter(db, { schema })`로 매핑한다. **[소스]** adapter의 schema 매핑과 `usePlural` 로직

---

## 9. OpenAPI/Scalar 문서에 포함

- `openAPI()` plugin(`better-auth/plugins`)이 다음을 제공한다. **[소스]** `plugins/open-api/index.mjs`, **[문서]** https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/open-api.mdx
  - `GET /api/auth/open-api/generate-schema`: OpenAPI **3.1.1** JSON. `servers: [{ url: baseURL }]`이고 paths는 basePath를 뺀 상대 경로(`/sign-in/email` 등)다.
  - `GET /api/auth/reference`: Scalar UI(jsdelivr CDN에서 로드). `disableDefaultReference: true`로 끌 수 있다.
  - 서버에서는 `auth.api.generateOpenAPISchema()`로 얻는다.
  - `disabledPaths`에 넣은 경로는 스키마에서 빠진다.
- 통합 방법 (공식 문서 예시):
  ```ts
  app.get("/docs", Scalar({ sources: [
    { url: "/openapi.json", title: "API" },                       // hono-openapi
    { url: "/api/auth/open-api/generate-schema", title: "Auth" },
  ]}));
  ```
  하나의 문서로 합치고 싶으면 `generateOpenAPISchema()` 결과의 paths에 `/api/auth`를 붙여서 hono-openapi 문서에 병합한다(직접 구현해야 함).
- 문서에 "This plugin is still in the early stages of development"라는 경고가 있다. 일부 엔드포인트 스키마가 불완전할 수 있다.
- **Hono RPC(`hc`) 타입에는 포함되지 않는다.** Admin에서는 `createAuthClient({ plugins: [adminClient(), passkeyClient()] })`(`better-auth/react` 또는 `better-auth/client`)를 따로 쓴다. 초대 수락과 재설정 링크 발급 같은 앱 엔드포인트는 Hono 라우트이므로 `hc` 타입에 들어간다. **[추론]**

---

## 10. 기타 주의점

- **rate limit**: Better Auth 내장 rateLimit의 기본 storage는 `"memory"`다 **[소스]** `init-options.ts` L283. Workers에서는 isolate마다 따로 있어서 거의 효과가 없다. `storage: "database"`(D1 `rateLimit` 테이블)나 `customStorage`를 쓰고, legacy의 rate limit 패턴과 함께 정리해야 한다.
- **Owner bootstrap**: `auth create-admin` CLI는 D1에 닿지 못한다(8장). bootstrap은 "사용자가 0명일 때만 열리는 setup 엔드포인트에서 `auth.api.createUser({ role: "owner" })`" 같은 방식을 앱에서 구현해야 한다. map의 "Owner 최초 설정 흐름" 항목에 입력이 된다.
- 비밀 값: `BETTER_AUTH_SECRET`(32바이트 이상)과 `BETTER_AUTH_URL`은 wrangler secret과 vars로 관리한다. `npx auth secret`으로 생성할 수 있다.

---

## 출처

- npm: `better-auth@1.7.12`, `@better-auth/core@1.7.12`, `@better-auth/passkey@1.7.12`, `@better-auth/drizzle-adapter@1.7.12`, `@better-auth/utils@0.5.0`, `auth@1.7.12`, `@better-auth/cli@1.4.22`(deprecated) — tarball 소스 직접 확인
- Better Auth 문서 (GitHub main, 2026-10-23 조회)
  - https://github.com/better-auth/better-auth/blob/main/docs/content/docs/integrations/hono.mdx
  - https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/database.mdx
  - https://github.com/better-auth/better-auth/blob/main/docs/content/docs/concepts/cli.mdx
  - https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/open-api.mdx
- Cloudflare
  - https://developers.cloudflare.com/workers/platform/limits/
  - https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
  - https://developers.cloudflare.com/workers/runtime-apis/bindings/
  - https://github.com/cloudflare/workerd/blob/main/src/workerd/api/crypto/impl.c++ , `pbkdf2.c++`
- 커뮤니티(2차 자료, 참고만): https://news.hada.io/topic?id=27399
