# hono-openapi, valibot, Scalar, Hono RPC가 함께 동작하는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

- **hono-openapi**(https://hono.dev/examples/hono-openapi) + **valibot**: `describeRoute`와 `validator`로 요청과 응답 스키마를 OpenAPI 3.1로 만드는 방법, branded type과 `v.pipe` transform(예: ISO 문자열을 `Temporal.Instant`로 바꾸는 것)이 스키마 생성에서 어떻게 처리되는지
- **Scalar**(https://hono.dev/examples/scalar) 마운트 방법과 인증된 요청을 어떻게 시험할지
- 이 구성에서 **Hono RPC(`hc`) 타입 추론**이 유지되는지(라우트 체이닝, 앱 분할 시 주의점)
- Hono에서 JSON으로 직렬화할 때 Temporal 값을 다루는 방법(응답 스키마는 문자열, 클라이언트에서 다시 parse)
- `@cloudflare/vitest-pool-workers`로 D1/R2 바인딩을 붙여 API를 테스트하는 현재 방법(버전, 설정, migration 적용)

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- 함께 동작한다. hono 4.13.13, hono-openapi 1.5.0, valibot 1.5.0, @valibot/to-json-schema 1.8.0, @scalar/hono-api-reference 0.12.13 조합으로 OpenAPI 3.1 생성과 `hc` 추론을 실제로 검증했다.
- `validator()`가 요청을 자동으로 문서화한다. 응답은 `describeRoute({ responses: … resolver(Dto) })`로 적는다.
- valibot의 brand와 `v.transform`은 스펙 생성에서 조용히 빠진다. 스키마는 **wire 스키마**(응답과 문서용)와 **parse 스키마**(transform 포함)를 짝으로 둔다. `v.metadata({ ref })`를 쓰면 `$ref`가 된다.
- `describeResponse`는 validator 타입을 잃으므로 `describeRoute` + `satisfies`를 쓴다.
- 기본 400 응답이 입력값을 되돌려 준다. 공통 validator hook으로 에러 형식을 통일한다.
- hc: brand가 응답 타입에 남는다. `Temporal.Instant`는 `string`으로 추론된다. 하위 앱은 체인으로 만들고, 규모가 커지면 `hcWithType`을 쓴다.
- Scalar: `app.get('/docs', Scalar({ url: '/openapi.json' }))`, Better Auth 스펙은 `sources`로 합친다.
- **Temporal 직렬화는 기본이 나노초 9자리다.** 자릿수가 섞이면 문자열 정렬이 깨지므로 저장과 응답 정밀도를 밀리초 3자리로 고정한다. JSON으로는 Instant만 내보낸다.
- **`@cloudflare/vitest-pool-workers`는 deprecated다.** `@cloudflare/vitest-plugin` 1.4.7(vitest ^4.1)을 쓰고, `readD1Migrations`와 `applyD1Migrations`를 쓴다. D1과 R2를 검증했다. 저장소 격리는 테스트 파일 단위다.

Context: branch `research/hono-openapi-valibot`, file `research/06-hono-openapi-valibot.md`
