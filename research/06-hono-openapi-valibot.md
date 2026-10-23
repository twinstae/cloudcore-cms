# hono-openapi + valibot + Scalar + Hono RPC + Workers 테스트

티켓: `.scratch/cms-rewrite/issues/06-research-hono-openapi-valibot.md`
조사일: 2026-10-23

## 확인한 버전

| 패키지 | 버전 | 비고 |
|---|---|---|
| `hono` | 4.13.13 | |
| `hono-openapi` | 1.5.0 | peer `hono ^4.11.2`, 의존성 `@hono/standard-validator ^0.4.0`, `@standard-community/standard-openapi 0.2.11` |
| `@hono/standard-validator` | 0.4.0 | |
| `valibot` | 1.5.0 | |
| `@valibot/to-json-schema` | 1.8.0 | valibot을 쓰려면 반드시 설치해야 함 |
| `@scalar/hono-api-reference` | 0.12.13 | |
| `temporal-polyfill` | 1.0.6 | |
| `typescript` | 7.0.2 | 아래 타입 검증은 TS7(`tsc`)로 했다 |
| `@cloudflare/vitest-plugin` | 1.4.7 | peer `vitest ^4.1.0 \|\| ^5.0.0`. **`@cloudflare/vitest-pool-workers`(최종 0.23.0)는 deprecated** |
| `vitest` | 4.1.12 | |

검증 방법: scratchpad에 throwaway 프로젝트 두 개를 만들어 (1) `tsc`로 타입을 확인하고 `bun`으로 OpenAPI 문서를 실제로 생성했고, (2) `vitest run`으로 D1/R2 바인딩이 붙은 Worker를 테스트했다. 아래에서 "검증함"이라고 쓴 항목은 이 실험으로 확인한 것이고, "미검증"은 문서만 읽었거나 추론한 것이다.

---

## 1. hono-openapi + valibot으로 OpenAPI 3.1 만들기

### 설치

```sh
bun add hono-openapi @hono/standard-validator valibot @valibot/to-json-schema
```

출처: https://hono.dev/examples/hono-openapi , https://honohub.dev/docs/openapi (Installation 표: Valibot → `@valibot/to-json-schema`)

### 기본 구조

- `validator(target, schema, hook?)` (`hono-openapi`에서 import): `@hono/standard-validator`의 `sValidator`를 감싼 것. `json`/`query`/`param`/`form`/`header`/`cookie` 검증이 그대로 OpenAPI의 `requestBody`/`parameters`가 된다. `describeRoute`에 request를 따로 적을 필요가 없다.
- `describeRoute({ tags, summary, responses: { 200: { content: { 'application/json': { schema: resolver(Schema) } } } } })`: 문서용 middleware. 반환 타입이 그냥 `MiddlewareHandler`라 RPC 타입에는 영향을 주지 않는다(검증함).
- `describeResponse(handler, { 200: { content: { 'application/json': { vSchema: Schema } } } })`: handler의 `c.json(...)` 반환 타입을 응답 스키마와 **컴파일 타임에 맞춰 보는** 래퍼. 스키마와 다른 모양을 반환하면 타입 에러가 난다(검증함). 단, 아래 "주의" 참고.
- `openAPIRouteHandler(app, { documentation })`: 스펙 JSON을 내보내는 handler. 결과는 `"openapi": "3.1.0"`(검증함). `generateSpecs(app, options)`로 직접 만들 수도 있다(빌드 타임 덤프, 스냅샷 테스트에 유용).

출처: `hono-openapi@1.5.0` `dist/index.d.ts`, https://github.com/rhinobase/hono-openapi/blob/main/_autodocs/api-reference/middlewares.md (ctx7 `/rhinobase/hono-openapi`)

```ts
const posts = new Hono<AppEnv>()
  .post(
    '/',
    describeRoute({
      tags: ['posts'],
      responses: { 201: { description: 'created', content: { 'application/json': { schema: resolver(PostDto) } } } },
    }),
    validator('json', CreatePost),
    (c) => {
      const body = c.req.valid('json') // publishedAt: Temporal.Instant | undefined (transform 출력 타입)
      return c.json(toPostDto(post), 201)
    },
  )

export const app = new Hono<AppEnv>().route('/api/posts', posts)
app.get('/openapi.json', openAPIRouteHandler(app, { documentation: { info: { title: 'Cloudcore', version: '0.0.0' } } }))
```

### branded type과 `v.pipe` transform은 스키마에서 어떻게 보이나 (검증함)

hono-openapi의 valibot 어댑터(`@standard-community/standard-openapi/dist/valibot-*.js`)는 `@valibot/to-json-schema`를 **`errorMode: "ignore"`** 로 호출한다. 그래서 JSON Schema로 표현할 수 없는 action은 에러 없이 조용히 빠진다.

| valibot | 생성된 OpenAPI |
|---|---|
| `v.pipe(v.string(), v.ulid(), v.brand('PostId'))` | `{ type: 'string', pattern: '^[0-7][\\da-hjkmnp-tv-zA-HJKMNP-TV-Z]{25}$' }`. brand는 사라진다 |
| `v.pipe(v.string(), v.isoTimestamp(), v.transform(s => Temporal.Instant.from(s)))` | `{ type: 'string', format: 'date-time' }`. transform은 사라진다 |
| `v.metadata({ ref: 'Post' })` | `components.schemas.Post`로 올라가고 `$ref`로 참조된다. path param에서도 `$ref` 사용 |
| `v.description('...')` | `description` |
| `v.optional(x, 'draft')` | `default: 'draft'`, `required`에서 빠짐 |
| `v.picklist([...])` | `enum` |

- 응답 스키마는 hono-openapi가 `typeMode: "output"`으로, 요청 스키마는 기본(input)으로 변환한다(`dist/index.js`의 `outputOptions`). transform이 무시되므로 **응답 스키마에 `InstantFromIso`(transform 포함)를 넣어도 문서는 `string/date-time`으로 나온다**. 하지만 의미상 응답 스키마는 wire 형식(문자열)이어야 하므로 응답용 스키마는 transform 없는 `IsoInstant`를 따로 두는 게 맞다(아래 4절).
- 주의: `errorMode: "ignore"` 때문에 변환 불가능한 스키마(예: `v.custom`, `v.instance`)가 조용히 `{}` 등으로 나올 수 있다(미검증: 어떤 모양이 나오는지는 확인 안 함). 생성된 `openapi.json`을 스냅샷 테스트로 고정해 두면 회귀를 잡을 수 있다.

### 기본 400 응답

`validator()`를 쓴 라우트에는 400 응답이 자동으로 문서화되고(`defaultValidationErrorResponse`, 기본 true), 실제 응답 body는 `{ success: false, error: [valibot issues...], data: <입력값 그대로> }`이다(검증함). **입력을 그대로 되돌려 주므로** 비밀번호 같은 필드가 있는 라우트나 일관된 에러 형식이 필요하면 `validator(target, schema, hook)`의 hook에서 직접 응답을 만들고 `defaultValidationErrorResponse`에 그 모양을 등록하는 것을 권한다.

### 주의: `describeResponse`는 앞선 validator/path의 타입을 잃는다 (검증함, 이슈 미확인)

```ts
.get('/:id', validator('param', v.object({ id: PostId })), describeResponse((c) => {
  c.req.valid('param') // TS 에러: Argument of type '"param"' is not assignable to parameter of type 'never'
  c.req.param('id')    // string | undefined (path 타입 '/:id'를 모름)
}, { ... }))
```

`describeResponse<E, P, I, T>`의 `E/P/I`가 체인의 문맥에서 추론되지 않고 기본값으로 떨어진다. 그래서 **validator와 함께 쓰기 어렵다**. 실용적인 대안:

1. `describeRoute({ responses: { 200: { content: { 'application/json': { schema: resolver(PostDto) } } } } })` + 일반 handler를 쓰고, handler에서 `return c.json(dto satisfies v.InferOutput<typeof PostDto>, 200)`처럼 `satisfies`로 스키마와 맞춘다. 또는 얇은 헬퍼 `jsonOf(c, PostDto, dto, 200)`를 만든다.
2. 응답 DTO를 만드는 함수(`toPostDto(row): v.InferOutput<typeof PostDto>`)를 한 곳에 두어 handler가 스키마 타입을 벗어날 수 없게 한다.

hc의 응답 타입은 어차피 `c.json(...)`의 인자 타입에서 나오므로(아래 3절), 1번 방식으로도 RPC 타입은 유지된다.

---

## 2. Scalar 마운트와 인증된 요청 시험

### 마운트

```ts
import { Scalar } from '@scalar/hono-api-reference'
app.get('/docs', Scalar({ url: '/openapi.json', pageTitle: 'Cloudcore API' }))
```

- `GET /docs`가 Scalar HTML을 반환하는 것을 확인했다(검증함, status 200).
- `Scalar((c) => ({ ... }))`처럼 함수로 넘기면 `c.env`를 보고 설정을 바꿀 수 있다(예: 운영에서는 숨기기, `proxyUrl` 개발 환경에서만).
- `Scalar.serve({ document })`로 문서와 UI를 한 mount에서 같이 서빙하는 API도 있다(`@scalar/hono-api-reference@0.12.13` `dist/scalar.d.ts`).
- `theme`, `cdn`(버전 고정) 옵션이 있다. 모든 테마에 light/dark가 있다.

출처: https://hono.dev/examples/scalar , `@scalar/hono-api-reference@0.12.13` 타입 정의

### Better Auth 문서와 합치기

Better Auth의 `openAPI()` 플러그인은 `/api/auth/open-api/generate-schema`에서 인증 엔드포인트 스펙을 내보낸다. Scalar의 `sources`로 두 문서를 한 UI에 띄울 수 있다.

```ts
app.get('/docs', Scalar({
  sources: [
    { url: '/openapi.json', title: 'API' },
    { url: '/api/auth/open-api/generate-schema', title: 'Auth' },
  ],
}))
```

출처: https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/open-api.mdx (ctx7 `/better-auth/better-auth`)

Better Auth handler(`/api/auth/*`)는 hono-openapi 스펙에서 `exclude: ['/api/auth/*']` 등으로 빼는 게 깔끔하다(미검증: 실제 Better Auth 라우트를 붙여서 확인하지는 않았다).

### 인증된 요청을 시험하는 방법

- 스펙의 `components.securitySchemes`와 전역 `security`는 `openAPIRouteHandler(app, { documentation: { components: { securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: '<session cookie name>' } } }, security: [{ cookieAuth: [] }] } })`로 넣는다(검증함: 스펙에 그대로 나옴). 라우트별로는 `describeRoute({ security: [...] })`.
- Scalar 설정에는 `authentication: { preferredSecurityScheme, securitySchemes: { name: { value | token | ... } } }`와 `persistAuth`가 있다(`@scalar/types` `authentication-configuration.d.ts`).
- **권장안 (미검증)**: Scalar를 API와 같은 origin(`admin.example.com/docs`)에서 서빙하고 Admin에서 먼저 로그인하면, Scalar가 같은 origin으로 보내는 `fetch`에 세션 쿠키가 기본(`credentials: 'same-origin'`)으로 붙을 것으로 예상한다. 브라우저에서는 `Cookie` 헤더를 JS로 직접 넣을 수 없으므로(forbidden header) Scalar의 cookie apiKey 입력란에 값을 넣는 방식은 브라우저에서 동작하지 않을 가능성이 크다.
- 대안: Better Auth `bearer()` 플러그인을 켜고 `securitySchemes`에 `{ type: 'http', scheme: 'bearer' }`를 등록하면 Scalar에서 토큰을 입력해 `Authorization` 헤더로 시험할 수 있다. 다만 bearer를 켜면 공격면이 늘어나므로 개발 환경에서만 켜는 것을 고려한다.
- 운영 환경에서 `/docs`, `/openapi.json`을 공개할지는 별도 결정이 필요하다(Owner 세션 필요로 막거나 dev에서만 노출).

---

## 3. Hono RPC(`hc`) 타입 추론 (검증함)

- hono-openapi의 `validator`는 hono 표준 validator와 같은 `Input` 타입을 만든다. `InferRequestType<typeof client.api.posts.$post>['json']`는 valibot **input** 타입(`publishedAt?: string`)이 되고, 서버 handler의 `c.req.valid('json')`은 **output** 타입(`Temporal.Instant`)이 된다.
- `describeRoute`는 타입에 영향이 없어 체인 중간에 넣어도 된다.
- 응답 타입은 `c.json(data, status)`의 `data` 타입에서 나온다. 상태 코드별로 좁혀진다(`r.status === 404`일 때 `{ error: string }`, `InferResponseType<..., 201>`).
- **branded type은 hc 응답 타입에 그대로 남는다**: `InferResponseType<..., 201>['id']`가 `string & Brand<"PostId">`. 클라이언트가 parse하지 않고도 brand가 붙은 값을 받는 셈이라 편하지만, 엄밀히는 "parse, don't validate" 원칙상 Admin/Site 경계에서 한 번 더 parse하는 것이 맞다(아래 4절).
- `Temporal.Instant`를 `c.json`에 그대로 넣으면 hc 타입은 `string`이 된다. Hono의 `JSONParsed`가 `toJSON()`의 반환 타입을 따르기 때문이다. 런타임에서도 `toJSON()`으로 ISO 문자열이 나간다.
- 앱 분할: Hono 공식 가이드대로 하위 앱을 `new Hono().get(...).post(...)` **체인**으로 만들고, 루트에서 `.route('/api/posts', posts).route(...)`를 **체인한 결과**의 타입을 `AppType`으로 export한다. `app.get(...)`처럼 체인 밖에서 붙인 라우트(예: `/openapi.json`, `/docs`)는 AppType에 안 들어간다(의도대로).
- `openAPIRouteHandler(app)`는 런타임에 `app.routes`를 읽으므로 `.route()`로 붙인 하위 앱 라우트도 스펙에 포함된다(검증함).
- IDE 성능: 라우트가 많아지면 `hc<typeof app>` 타입을 미리 계산해 두는 `hcWithType` 패턴을 쓰라고 공식 문서가 권한다. 모노레포에서는 `apps/api`가 `.d.ts`를 내보내고 Admin/Site가 그것을 참조하는 구조가 맞다(출처: https://hono.dev/docs/guides/rpc "Known issues > IDE performance").
- 테스트에서 hc를 in-process로 쓰려면 `hc<AppType>('http://x', { fetch: (i, init) => app.request(i, init, env) })`(검증함, Workers 테스트 안에서도 동작).

출처: https://hono.dev/docs/guides/rpc , https://hono.dev/docs/guides/best-practices (ctx7 `/websites/hono_dev`)

---

## 4. Temporal 값의 JSON 직렬화 (검증함)

- `Temporal.Instant.prototype.toJSON()`은 `toString()`과 같고 UTC `Z` 형식이다. temporal-polyfill에서 `JSON.stringify({ now })` → `{"now":"2026-10-23T03:59:05.235130981Z"}`. **기본은 나노초 9자리**다.
- `v.isoTimestamp()`는 9자리 소수, `+09:00` offset 모두 통과한다. 초가 없는 값(`...T03:56Z`), 날짜만 있는 값은 거부한다.
- `Temporal.ZonedDateTime`의 JSON은 `"2026-10-23T12:59:05...+09:00[Asia/Seoul]"`로 대괄호 timezone이 붙어 `isoTimestamp`를 통과하지 못한다. **API 응답에는 Instant만 내보낸다**(map의 "표시할 때만 timezone 적용"과 일치).
- 권장 패턴:
  - 공유 패키지에 `IsoInstant`(wire, transform 없음: 응답 스키마/문서용)와 `InstantFromIso`(`IsoInstant` + `v.transform(Temporal.Instant.from)`: 요청 parse, DB row parse, 클라이언트에서 응답 parse용) 두 개를 둔다.
  - 응답 DTO 변환 함수에서 `instant.toString({ fractionalSecondDigits: 3 })` 또는 `round({ smallestUnit: 'millisecond' })`로 **정밀도를 고정**한다.
  - 클라이언트(Admin의 TanStack Query `queryFn`, Site의 loader)는 `await res.json()` 결과를 공유 패키지의 "parse용" DTO 스키마로 `v.parse`해서 `Temporal.Instant`와 brand를 얻는다.
- **map에 영향 있는 발견**: DB에 ISO 문자열로 저장할 때 소수 자릿수가 섞이면 문자열 정렬이 깨진다. `'.'`(0x2E) < `'Z'`(0x5A)이므로 `"…:05.235Z" < "…:05Z"`가 된다. `ORDER BY published_at`을 문자열로 하려면 **저장 형식을 고정 자릿수(예: 밀리초 3자리 `YYYY-MM-DDTHH:mm:ss.sssZ`)로 정해야 한다**. DB 경계의 serialize 함수 한 곳에서 강제하는 것을 권한다.

---

## 5. Workers에서 D1/R2 바인딩으로 API 테스트

### 패키지 이름이 바뀌었다

`@cloudflare/vitest-pool-workers` README(0.23.0): "has been renamed to `@cloudflare/vitest-plugin`. This package will not receive future updates." 마이그레이션 가이드에 따르면 API와 설정은 그대로이고 이름만 바뀌었다.

- 출처: https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-to-vitest-plugin/ , npm `@cloudflare/vitest-pool-workers@0.23.0` README, npm `@cloudflare/vitest-plugin@1.4.7`
- 코드모드: `npx @cloudflare/codemods vitest:pool-workers-to-vitest-plugin`
- 요구사항: `vitest ^4.1.0` (5도 허용).

### 설정 (검증함: vitest 4.1.12 + plugin 1.4.7, 테스트 4개 통과)

```ts
// vitest.config.ts  (package.json "type": "module" 필요: 최상위 await 때문. 없으면 "Top-level await is currently not supported with the 'cjs' output format")
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'
import path from 'node:path'

const migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'))

export default defineConfig({
  plugins: [
    cloudflareTest({
      remoteBindings: false, // 로컬 Miniflare만 사용
      wrangler: { configPath: './wrangler.jsonc' }, // D1/R2 바인딩은 wrangler 설정에서 읽힌다
      miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
    }),
  ],
  test: { setupFiles: ['./test/apply-migrations.ts'] },
})
```

```ts
// test/apply-migrations.ts
import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
```

```ts
// test/posts.test.ts
import { exports } from 'cloudflare:workers'
const res = await exports.default.fetch('http://x/posts/a', { method: 'POST' })
```

- `SELF`는 deprecated이고 `import { exports } from 'cloudflare:workers'`의 `exports.default.fetch()`를 쓴다(`types/cloudflare-test.d.ts`).
- tsconfig: `"types": ["@cloudflare/vitest-plugin/types"]` + `wrangler types` 출력 파일 include(출처: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/).
- `readD1Migrations`는 drizzle-kit가 만드는 `--> statement-breakpoint` 주석이 들어간 SQL도 정상 적용했다(검증함). wrangler처럼 중첩 폴더(`0001_init/migration.sql`)를 읽으려면 `{ migrationsDir, migrationsPattern }` 옵션을 쓴다.
- R2는 wrangler 설정의 `r2_buckets`만으로 로컬 바인딩이 생긴다(검증함: put/list 동작).
- **격리 단위는 테스트 파일**이다(검증함). 같은 파일 안의 테스트끼리는 D1/R2 상태가 이어지고, 다른 파일은 빈 상태에서 시작한다. 테스트마다 깨끗한 상태가 필요하면 파일을 나누거나 `beforeEach`에서 직접 정리한다.
- Cloudflare Images binding은 이번에 시험하지 않았다(미검증). Miniflare에 로컬 시뮬레이션이 있는지, `remoteBindings: false`에서 어떻게 동작하는지는 구현 티켓에서 확인해야 한다.
- Better Auth를 붙인 상태의 인증 테스트(세션 쿠키 발급 후 요청)는 시험하지 않았다(미검증).

---

## 요약: 이 조합은 함께 동작하는가

동작한다. 남는 결정/주의점:

1. `describeResponse`는 validator와 함께 쓰면 타입이 깨지므로 `describeRoute + resolver` + `satisfies`/DTO 함수 패턴으로 응답 타입을 맞춘다.
2. valibot의 brand와 transform은 OpenAPI 생성에서 조용히 무시된다. 스키마는 "wire 스키마(문서/응답)"와 "parse 스키마(transform 포함)"를 짝으로 둔다. `v.metadata({ ref })`로 components를 만든다.
3. 기본 400 응답이 입력을 그대로 되돌려 준다. 공통 hook으로 에러 형식을 통일한다.
4. Temporal은 Instant만 JSON으로 내보내고, 저장/응답 정밀도를 고정한다(문자열 정렬 문제).
5. `@cloudflare/vitest-pool-workers` 대신 `@cloudflare/vitest-plugin` + vitest 4를 쓴다.
6. Scalar 인증 시험은 same-origin 쿠키(미검증) 또는 dev 전용 bearer 플러그인으로 한다.

## 출처

- https://hono.dev/examples/hono-openapi
- https://hono.dev/examples/scalar
- https://hono.dev/docs/guides/rpc
- https://honohub.dev/docs/openapi
- https://github.com/rhinobase/hono-openapi/blob/main/_autodocs/api-reference/middlewares.md
- https://github.com/better-auth/better-auth/blob/main/docs/content/docs/plugins/open-api.mdx
- https://developers.cloudflare.com/workers/testing/vitest-integration/
- https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/
- https://developers.cloudflare.com/workers/testing/vitest-integration/migration-guides/migrate-to-vitest-plugin/
- https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-plugin-examples/d1
- npm 패키지 소스: `hono-openapi@1.5.0`, `@standard-community/standard-openapi@0.2.11`, `@scalar/hono-api-reference@0.12.13`, `@scalar/types@0.24.0`, `@cloudflare/vitest-pool-workers@0.23.0`, `@cloudflare/vitest-plugin@1.4.7`
