# Better Auth를 Workers + D1에서 쓸 수 있는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

Better Auth를 Cloudflare Workers(Hono) + D1(Drizzle adapter)에서 쓸 때 다음을 확인한다.
- 지원 상태, 알려진 제약(Node API, crypto, 번들 크기, 무료 플랜 CPU 시간 10ms 안에서 비밀번호 해싱이 가능한지)
- 요청마다 `env` 바인딩으로 인스턴스를 만드는 패턴
- 같은 origin(`admin.example.com`)에서의 세션 쿠키 설정
- **passkey 플러그인** 사용법
- **초대 링크 전용 가입**: 공개 가입을 막고 Owner가 발급한 토큰으로만 가입하는 방법. 기존 플러그인(admin, organization invitation 등)으로 되는지, 직접 구현해야 하는지.
- **비밀번호 재설정 링크를 Owner가 발급**: 메일 없이 링크로 처리하는 방법
- Owner/Author 두 역할을 어떻게 표현할지
- Drizzle 스키마 생성(CLI)과 D1 migration 흐름
- Better Auth 엔드포인트를 OpenAPI/Scalar 문서에 포함할 수 있는지

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- Better Auth 1.7.12는 Workers+D1+Drizzle 조합을 공식 지원한다. `nodejs_compat`이 필요하다. drizzle adapter는 transaction을 쓰지 않아 D1과 호환되고, `provider: "sqlite"`로 설정한다.
- **무료 플랜의 CPU 10ms 안에서는 기본 비밀번호 해싱이 불가능하다.** 기본 scrypt(N=16384,r=16) 1회가 로컬 측정으로 약 70ms다. 로그인, 초대 수락, 재설정마다 이 비용이 든다. 대안은 Workers Paid를 쓰거나 `emailAndPassword.password.{hash,verify}`를 바꾸는 것이다. workerd에 PBKDF2와 scrypt 상한이 있다(값은 미검증).
- 번들 약 1.26MB(gzip 약 330KB)로 문제없다. Better Auth가 zod v4를 함께 가져온다.
- `import { env } from "cloudflare:workers"`로 모듈 스코프 싱글톤을 만든다(공식 패턴).
- 같은 origin에서는 기본 쿠키로 충분하다. `baseURL`만 정확히 설정하면 된다.
- passkey는 `@better-auth/passkey`로 한다. 기본 설정에서는 fresh session에서만 등록할 수 있다.
- 초대 전용 가입은 내장 기능이 없다. Invitation 테이블과 수락 엔드포인트를 직접 만들고, 서버에서 `auth.api.createUser({ role: "author" })`를 호출한 뒤 `signInEmail`로 세션을 발급한다.
- Owner가 발급하는 재설정 링크: `verification`에 `reset-password:<token>`을 넣고, 소비는 내장 `POST /reset-password`가 한다. 또는 admin plugin의 `setUserPassword`를 쓴다.
- 역할은 admin plugin의 `role`에 `adminRoles:["owner"]`, `defaultRole:"author"`로 둔다. 쓰지 않는 엔드포인트는 `disabledPaths`로 끈다. "Owner는 1명" 규칙과 Content 권한은 앱 레이어에서 지킨다.
- 스키마: CLI는 `npx auth@latest generate`(`@better-auth/cli`는 deprecated)다. Drizzle 스키마 생성, `drizzle-kit generate`, `wrangler d1 migrations apply` 순서로 한다. CLI가 D1에 닿지 못하므로 Owner bootstrap은 앱 엔드포인트로 만들어야 한다.
- `openAPI()` plugin의 스펙은 Scalar `sources`로 합친다. Better Auth 엔드포인트는 `hc` 타입에 들어가지 않으므로 Admin에서는 `better-auth/client`(adminClient, passkeyClient)를 쓴다.
- 내장 rateLimit의 기본 memory storage는 Workers에서 효과가 없다. database나 custom storage가 필요하다.

Context: branch `research/better-auth-on-workers-d1`, file `research/01-better-auth-on-workers-d1.md`
