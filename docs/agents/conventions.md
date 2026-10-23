# 코드 컨벤션

뼈대(ticket 21)의 코드가 예시다. 새 코드는 이 규칙과 그 예시를 따른다. 프로토타입도 예외가 아니다. 짧은 코드일수록 모범 사례가 되어 그대로 복제된다.

## Admin 컴포넌트

- **기능 컴포넌트는 데이터를 props로 받는다.** `useQuery`를 직접 부르지 않고, `queryOptions`를 props로 받지도 않는다. 예: `HealthStatus({ connected })`.
- **라우트가 데이터를 가져와 합성한다.** `loader`에서 `queryClient.ensureQueryData(xxxQueryOption)`, 컴포넌트에서 `useSuspenseQuery(xxxQueryOption)`로 꺼내 props로 넘긴다. 실패는 `errorComponent`.
- query options는 `src/queries/<자원>.ts`에 두고 이름은 `<자원>QueryOption`이다. API 클라이언트(`src/lib/api.ts`)를 아는 곳은 여기뿐이다.

## 스타일 (Panda)

- 기능 컴포넌트에서 `css()`/style props를 하드코딩하지 않는다. `src/components/ui`의 디자인 시스템 컴포넌트를 합성한다.
- ui 컴포넌트는 `styled(ark.<el>, recipe)` 한 줄이다. 모양은 `src/theme/recipes/*`의 recipe(`defineRecipe`, 여러 부분이면 `defineSlotRecipe` → `slotRecipes`)에, 색은 `src/theme/semantic-tokens.ts`의 semantic token(라이트/다크)에 둔다.
- 필요한 recipe가 없으면 기능 컴포넌트에 스타일을 쓰지 말고 recipe/variant를 추가한다.

## 컴포넌트 테스트

- `@siheom/react`를 직접 import하지 않는다. `src/test/siheom.tsx`의 `runSiheom`/`given`/`actions`/`assertions`/`query`를 쓴다. 이 모듈이 `overrideSiheom`으로 `render`를 `TestProvider`(QueryClient 등)로 감싼다. 테스트마다 Provider를 다시 감싸지 않는다.
- 데이터는 props로 넣는다. 컴포넌트가 데이터를 받으므로 네트워크 fake가 필요 없는 것이 기본이다.
- `vi.mock`/`vi.fn`/`vi.spyOn` 금지(oxlint). 의존성은 주입하고 fake를 넘긴다.

## 경계와 Result

- 외부 세계(HTTP JSON, DB row)는 **wire** 스키마로 parse하고 `decode`로 도메인 모델(branded type, `Temporal.Instant`)을 만든다. 나갈 때는 `encode`로 wire 모양을 만든다. `@cloudcore/schema`의 `TagWire`/`Tag`/`decodeTag`/`encodeTag`가 예시다. 문자열 시각이나 brand 없는 값이 안쪽으로 들어오면 안 된다.
- 예상된 실패는 예외가 아니라 **`better-result`의 `Result`**로 돌려준다. 실패에는 `TaggedError`로 태그를 붙이고, HTTP 매핑은 라우트에서 `error.match({ ... })` 한 곳에만 둔다. 오류 종류가 늘면 match가 컴파일을 막는다.
- 리소스마다 `CreateResult` 같은 일회용 union을 만들지 않는다. store의 반환 타입은 `Result<T, 태그된 오류 union>`이다.
- 라우트는 `dbMiddleware`가 넣은 `c.var.db`로 store를 합성한다(`createTagStore(c.var.db)`).

## API 테스트

- `fetch`를 직접 쓰지 않는다. `apps/api/test/client.ts`의 `client`를 쓴다: `const data = await client.get("/api/health")`. 경로와 응답 타입은 `AppType`에서 추론된다.
- 2xx가 아니면 `ApiError(status, body)`를 던진다. 실패 케이스는 `.catch((e) => e)` 후 `toMatchObject({ status })`로 검사한다.
- 새 메서드(post/patch/delete, 경로 파라미터)는 필요한 슬라이스에서 이 클라이언트에 추가한다.
