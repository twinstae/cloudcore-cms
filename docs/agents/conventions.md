# 코드 컨벤션

뼈대(ticket 21)의 코드가 예시다. 새 코드는 이 규칙과 그 예시를 따른다. 프로토타입도 예외가 아니다. 짧은 코드일수록 모범 사례가 되어 그대로 복제된다.

## Admin 컴포넌트

- **기능 컴포넌트는 데이터를 props로 받는다.** `useQuery`를 직접 부르지 않고, `queryOptions`를 props로 받지도 않는다. 예: `HealthStatus({ connected })`.
- **라우트가 데이터를 가져와 합성한다.** `loader`에서 `queryClient.ensureQueryData(xxxQueryOption)`, 컴포넌트에서 `useSuspenseQuery(xxxQueryOption)`로 꺼내 props로 넘긴다. 실패는 `errorComponent`.
- **화면은 props로 받는다.** 화면 상태가 URL에서 오면(예: `?edit=<id>`) 그 값을 prop(`editingId`)으로, 변경 요청은 콜백(`onEditingChange`)으로 노출한다. `TagsScreen`처럼 라우트와 분리해야 라우터 없이 상호작용을 테스트할 수 있다.
- query options는 `src/queries/<자원>.ts`에 두고 이름은 `<자원>QueryOption`이다. API 클라이언트(`src/lib/api.ts`)를 아는 곳은 여기뿐이다.

## 스타일 (Panda)

- 기능 컴포넌트에서 `css()`/style props를 하드코딩하지 않는다. `src/components/ui`의 디자인 시스템 컴포넌트를 합성한다.
- ui 컴포넌트는 `styled(ark.<el>, recipe)` 한 줄이다. 모양은 `src/theme/recipes/*`의 recipe에, 색은 `src/theme/semantic-tokens.ts`의 semantic token(라이트/다크)에 둔다.
- 필요한 recipe가 없으면 기능 컴포넌트에 스타일을 쓰지 말고 recipe/variant를 추가한다.
- 프리셋에 이미 있는 패턴(`hstack`, `vstack` 등)은 `styled-system/jsx`에서 재노출해 쓴다. 같은 이름의 recipe를 만들면 조용히 무시되어 스타일이 비어 버린다.
- **ui 컴포넌트 추가 순서**: ① `src/theme/recipes/<이름>.ts`에 recipe를 쓰고 ② `recipes/index.ts`의 `recipes`에 등록하고 ③ `src/components/ui/<이름>.tsx`에서 `styled(ark.<el>, recipe)`로 만들고 ④ `ui/index.ts`에서 export한다. 마지막에 `bun run codegen`(Panda)을 돌린다.
- 공통 부품이 여러 개인 컴포넌트(Field의 root/label/error 등)는 **부분별 `defineRecipe`**를 쓴다. Panda 2.4에서 `styled`는 slot recipe의 `.root`/`.label` 타입을 주지 않으므로 `defineSlotRecipe`는 쓰지 않는다.
- 라벨이 있는 컨트롤은 라벨 텍스트만 접근성 이름이 되게 한다(예: `이름 *` 금지). 필수 표시는 `required`/`aria-required`로 넘긴다.

## 컴포넌트 테스트

- **UI 검증은 siheom 테스트로 한다.** 브라우저를 직접 조작하거나 스크린샷을 찍어 확인하지 않는다(사용자가 명시적으로 요청할 때만). 사용법은 `.claude/skills/siheom-frontend-test/SKILL.md`.
- `@siheom/react`를 직접 import하지 않는다. `src/test/siheom.tsx`의 `runSiheom`/`given`/`actions`/`assertions`/`query`/`withFakeTimers`를 쓴다. 이 모듈이 `overrideSiheom`으로 `render`를 `TestProvider`(QueryClient 등)로 감싼다. 테스트마다 Provider를 다시 감싸지 않는다.
- 데이터는 props로 넣는다. 컴포넌트가 데이터를 받으므로 네트워크 fake가 필요 없는 것이 기본이다.
- `vi.mock`/`vi.fn`/`vi.spyOn` 금지(oxlint). 의존성은 주입하고 fake를 넘긴다.
- `assertions.visible(target)`은 **보여야 함**이 기본이다(래퍼가 siheom 기본값을 뒤집었다). 숨김을 확인할 때만 `false`를 넘긴다.

## 의존성

- 앱에서 다른 workspace 패키지(`@cloudcore/schema` 등)를 import하면 그 앱의 `package.json` dependencies에 `workspace:*`로 반드시 넣는다. 빠지면 TS는 통과하고 Vite dep scan이 실패해 `Vitest failed to find the current suite`나 `react-dom/client does not provide createRoot` 같은 무관한 오류가 난다. `bun run check:workspace-deps`가 잡는다.

## 경계와 Result

- 외부 세계(HTTP JSON, DB row)는 **wire** 스키마로 parse하고 `decode`로 도메인 모델(branded type, `Temporal.Instant`)을 만든다. 나갈 때는 `encode`로 wire 모양을 만든다. `@cloudcore/schema`의 `TagWire`/`Tag`/`decodeTag`/`encodeTag`가 예시다. 문자열 시각이나 brand 없는 값이 안쪽으로 들어오면 안 된다.
- 예상된 실패는 예외가 아니라 **`better-result`의 `Result`**로 돌려준다. 실패에는 `TaggedError`로 태그를 붙이고, HTTP 매핑은 라우트에서 `error.match({ ... })` 한 곳에만 둔다. 오류 종류가 늘면 match가 컴파일을 막는다.
- 리소스마다 `CreateResult` 같은 일회용 union을 만들지 않는다. store의 반환 타입은 `Result<T, 태그된 오류 union>`이다.
- 라우트는 `dbMiddleware`가 넣은 `c.var.db`로 store를 합성한다(`createTagStore(c.var.db)`).

## API 테스트

- `fetch`를 직접 쓰지 않는다. `apps/api/test/client.ts`의 `client`를 쓴다: `const data = await client.get("/api/health")`. 경로와 응답 타입은 `AppType`에서 추론된다.
- 2xx가 아니면 `ApiError(status, body)`를 던진다. 실패 케이스는 `.catch((e) => e)` 후 `toMatchObject({ status })`로 검사한다.
- 새 메서드(post/patch/delete, 경로 파라미터)는 필요한 슬라이스에서 이 클라이언트에 추가한다.
