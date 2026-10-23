# 이 레포가 따를 컨벤션 초안 (참고 자료: modern-react-starter, siheom-ts, bunja)

- 티켓: `.scratch/cms-rewrite/issues/07-research-reference-conventions.md`
- 조사일: 2026-10-23
- 이 문서는 09 prototype 티켓의 입력이다. 여기 적은 것은 "초안"이며, prototype에서 깨지면 고친다.

## 확인한 출처 (버전 고정)

| 출처 | 위치 | 기준 |
| --- | --- | --- |
| modern-react-starter | `/media/taehee/samsung/github/modern-react-starter` (로컬) | commit `4bcb0e1` "chore: pandacss 등 버전 최신화" |
| siheom-ts | https://github.com/twinstae/siheom-ts | commit `777a20b` (2026-10-15). `@siheom/react` 0.4.0, `@siheom/core` 0.4.0, `@siheom/ime` 0.3.1, `@siheom/ime-cdp` 0.3.1 |
| bunja | https://github.com/disjukr/bunja | commit `a10a9d8` (2026-09-02). npm `latest` = 3.0.1 (레포 `bunja/package.json`은 아직 2.0.0으로 적혀 있음) |

아래에서 경로만 적은 것은 starter 기준 상대 경로다. siheom 문서는 `apps/docs/...`, bunja는 `bunja/...` 또는 `examples/timer/...`로 적는다.

---

## 0. 참고 자료와 map.md 결정이 갈리는 지점 (먼저 읽을 것)

| 항목 | starter / 참고 자료 | 이 레포 (map.md) | 따라서 |
| --- | --- | --- | --- |
| 앱 프레임워크 | TanStack **Start** (`tanstackStart({ spa: { enabled: true } })` + `nitro()`), `src/router.tsx`에서 `setupRouterSsrQueryIntegration` | TanStack **Router** SPA (Hono Worker가 정적 자산 서빙) | Start/nitro/`@tanstack/react-router-ssr-query`/`shellComponent`/`HeadContent`/`Scripts`는 가져오지 않는다. 라우트 생성은 `@tanstack/router-plugin`(vite) 또는 `tsr generate`로 한다. `tsr.config.json`은 `{"target":"react"}` 한 줄뿐이라 SPA에서도 그대로 쓸 수 있지만 `routesDirectory`/`generatedRouteTree`는 앱 위치에 맞게 정해야 한다(09에서 확인). |
| API 서버/클라이언트 | Elysia + `@elysiajs/eden` | Hono + `hc` (Hono RPC) | Eden 대신 `hc` 타입을 쓴다. 단, 기능 컴포넌트는 어느 쪽이든 **API 클라이언트를 모른다**(props로 `queryOptions`/`onSubmit` 주입). |
| DB | Postgres(PGlite 테스트) + Drizzle | D1 + Drizzle | starter의 `server` vitest project(node + PGlite)는 가져오지 않고, API 테스트는 `@cloudflare/vitest-pool-workers`로 한다. |
| 타입체크 | `tsc --noEmit -p tsgoconfig.json` (TypeScript 7, `baseUrl: null`) | tsrs, 안 되면 `tsc` TS7 | starter의 `tsgoconfig.json` 트릭(`baseUrl`을 null로 덮고 `paths`만 사용)은 TS7 fallback에 그대로 쓸 수 있다. |
| 품질 게이트 | `bun run ci` 스크립트(lint:fix → format → typecheck → test) | lefthook pre-push, GitHub Actions 없음 | 스크립트 묶음 아이디어만 가져오고, 실행 지점은 lefthook으로 바꾼다. pre-push에서는 `--fix`/쓰기 포맷 대신 `oxlint`(fix 없음)와 `oxfmt --check`를 쓴다. |
| 스키마 → 폼 | valibot + `standardSchemaResolver` (Standard Schema) | valibot | 그대로 가져온다. |
| Storybook framework | `@storybook/tanstack-react`. 그런데 story 파일은 `@storybook/react-vite`에서 `Meta`/`StoryObj`를 import (`src/components/ui/button.stories.tsx`) | 같음 | 이 레포에서는 framework 패키지와 같은 곳에서 타입을 import하도록 통일한다. |
| story가 테스트로 돌아가는가 | `@storybook/addon-vitest`는 addon에만 있고 `vite.config.ts`의 vitest projects에 `storybookTest()` 플러그인이 **없다**. story는 `*.test.tsx`가 `Stories.Empty.args`처럼 import해서 재사용할 뿐이다. | "story를 컴포넌트마다, Vitest browser + siheom으로 테스트" | starter 방식(story = fixture, 시험은 `*.test.tsx`에서 siheom으로)을 따른다. story 자체를 smoke test로 돌릴지는 09에서 결정. |
| jotai / bunja | `package.json`에 `jotai`, `jotai-tanstack-query`, `bunja`가 있지만 `src/`에서 **한 번도 쓰지 않는다** | jotai + bunja 사용 | starter에는 참고할 사용 예가 없다. bunja 레포의 `examples/timer`를 기준으로 삼는다(아래 5절). |
| 한국어 IME 테스트 대상 | `@siheom/ime`는 input/textarea가 주 대상. **contenteditable은 기본 프로필에서 user-event로 폴백** | 에디터(Lexical/Koenig, contenteditable) 한국어 입력을 `@siheom/ime`로 테스트 | 가장 큰 차이. 6.3절 참고. |

---

## 1. 디렉터리와 파일 이름

starter의 구조를 Admin(`apps/admin/src`)에 거의 그대로 옮긴다.

```
apps/admin/src/
  components/
    ui/            # Ark UI + Panda recipe 래퍼. 파일마다 *.stories.tsx
    form/          # SimpleForm, SimpleField 계열, SubmitButton, story-utils.tsx
  features/<기능>/  # (이 레포에서 추가) 기능 컴포넌트 + stories + tests
  routes/          # TanStack Router 파일 기반 라우트. 합성과 의존성 주입만
  fakes/           # *.fake.ts(x) — vi.mock 대신 alias로 바꿔 끼우는 가짜
  lib/             # invariant, standard-schema 헬퍼 등
  theme/           # (shared preset 패키지로 옮길 후보) recipes, tokens, colors, conditions
  setupTest.ts
```

- 파일 이름은 kebab-case(`simple-field.tsx`, `submit-button.test.tsx`). starter `src/stories/ExapmleForm.tsx`처럼 PascalCase 파일(오타 포함)은 예제일 뿐이므로 따르지 않는다.
- import 경로는 `@/…` alias + **확장자 포함**(`"./simple-form.tsx"`). `tsconfig.json`에 `allowImportingTsExtensions`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`, `noUncheckedSideEffectImports`가 켜져 있다.
- Panda 생성물은 `styled-system/*`로 import한다(`tsconfig.json` `paths`).
- `components.json`은 Park UI CLI 설정(`aliases.ui = "@/components/ui"`, `recipes = "@/theme/recipes"`)이다. UI 컴포넌트는 Park UI에서 가져와 다듬는 방식이므로 이 파일도 함께 가져온다.

## 2. 폼: `SimpleForm` / `SimpleField`

### 2.1 구조 (그대로 가져온다)

`SimpleForm`은 `useForm` + `FormProvider`를 감싸고, 스키마는 **Standard Schema**로 받는다. valibot 스키마를 그대로 넘기면 된다.

```tsx
// src/components/form/simple-form.tsx
interface SimpleFormProps<Input, Output> extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  schema: StandardSchemaV1<Input, Output>;
  defaultValues: FieldValues;
  onSubmit: (values: Output) => Promise<void>;
  reValidateMode?: "onBlur" | "onSubmit";
}
// ...
const methods = useForm({
  defaultValues,
  resolver: standardSchemaResolver(schema),   // @hookform/resolvers/standard-schema
  reValidateMode: reValidateMode ?? "onSubmit",
});
```

필드 컴포넌트는 `name`/`label`/`hint`만 받고 `value`/`onChange`를 받지 않는다. 내부에서 `useFormContext()` + `Controller`로 연결한다.

```tsx
// src/components/form/simple-field.tsx (SimpleInput 발췌)
<Field.Root>
  <Field.Label>{label} {props.required && <Field.RequiredIndicator />}</Field.Label>
  <Input
    name={name} value={field.value} onChange={field.onChange}
    aria-invalid={isError}
    aria-describedby={isError ? errorId : hint ? descriptionId : undefined}
    aria-errormessage={isError ? errorId : undefined}
    {...props}
  />
  {hint && !isError && <Field.HelperText id={descriptionId}>{hint}</Field.HelperText>}
  {isError && errorMessage && (
    <Field.ErrorText id={errorId} role="alert" aria-label={errorMessage}>{errorMessage}</Field.ErrorText>
  )}
</Field.Root>
```

`SubmitButton`은 `formState.isSubmitting`으로 로딩/비활성을 자동 표시한다(`src/components/form/submit-button.tsx`).

**컨벤션**

1. 폼은 항상 `SimpleForm` + `Simple*` 필드로 만든다. 폼 상태를 `useState`로 들지 않는다(map.md와 일치).
2. 기능 폼 컴포넌트는 `onSubmit: (values: Output) => Promise<void>`과 초기값을 props로 받는다. 예: `ExapmleForm({ addData, initData })` (`src/stories/ExapmleForm.tsx`). 라우트가 mutation을 주입한다.
3. 에러 메시지는 valibot 스키마 안에 한국어로 쓴다(`v.minLength(1, "이름을 입력해주세요")`, `src/stories/schema.ts`). 스키마는 공유 패키지에 두고 branded output을 쓴다. 예제에서도 `__brand: v.literal("ValidData")`로 output을 구분한다. 이 레포에서는 `v.brand()`를 쓰는 쪽으로 바꾼다(브랜드를 폼 값에 넣지 않기 위해).
4. 접근성 배선(`aria-invalid`, `aria-describedby`, `aria-errormessage`)은 필드 컴포넌트가 책임진다. 그래서 테스트에서 `assertions.errormessage(query.textbox("이름"), "…")`가 동작한다.
5. 새 필드 종류(Select, Textarea, DatePicker 등)는 `SimpleInput`과 같은 틀로 추가한다. starter에는 Temporal 기반 DatePicker가 주석으로만 남아 있다(`simple-field.tsx` 상단). Ark UI Select는 `Select.HiddenSelect`, Checkbox는 `Checkbox.HiddenInput`을 꼭 넣는다(siheom `apps/docs/guides/headless-components.md`의 Ark UI 표).

### 2.2 필드 story 헬퍼

`FormFieldStory`가 `FormProvider`만 깔아 주고, `errors` prop으로 `setError`를 걸어 Invalid 상태를 보여 준다.

```tsx
// src/components/form/story-utils.tsx
export function FormFieldStory({ children, defaultValues, errors }: {...}) {
  const methods = useForm({ defaultValues });
  useEffect(() => {
    if (!errors) return;
    for (const [name, message] of Object.entries(errors)) {
      methods.setError(name, { type: "manual", message });
    }
  }, []);
  return <FormProvider {...methods}><div className={css({ width: "320px" })}>{children}</div></FormProvider>;
}
```

**컨벤션**: 필드마다 story를 `Default / WithHint / WithPlaceholder / Required / WithValue / Disabled / Invalid`로 맞춘다(`simple-input.stories.tsx`, `simple-checkbox.stories.tsx`). `title`은 `"Form/SimpleInput"`, `"UI/Button"`처럼 폴더 접두사를 붙인다.

## 3. UI 컴포넌트: Ark UI + Panda recipe

### 3.1 래퍼 패턴

- 단일 요소 컴포넌트: `styled("button", button)`처럼 recipe로 styled를 만들고 필요한 동작(예: `loading`)만 덧붙인다(`src/components/ui/button.tsx`). 기본 `type="button"`.
- 복합 컴포넌트: `createSlotRecipeContext(slotRecipe)`의 `withProvider`/`withContext`로 Ark 파츠를 감싸 **namespace export**한다.

```tsx
// src/components/ui/dialog.tsx
const { withProvider, withContext } = createSlotRecipeContext(dialog);
export const Root = withProvider(Dialog.Root, "root");
export const Trigger = withContext(Dialog.Trigger, "trigger");
export const Content = withContext(Dialog.Content, "content");
export const Title = withContext(Dialog.Title, "title");
// ...
export { DialogContext as Context } from "@ark-ui/react/dialog";
```

- 사용처에서는 `import * as Dialog from "@/components/ui/dialog.tsx"` → `<Dialog.Root>`.
- 배럴 `src/components/ui/index.ts`는 단일 컴포넌트는 named, 복합 컴포넌트는 `export * as Card from "./card"`로 내보낸다.

### 3.2 recipe 등록 규칙

```ts
// src/theme/recipes/index.ts
// defineSlotRecipe로 정의한 레시피는 slotRecipes에 등록해야 v2 codegen이
// slots를 포함해 생성한다 (recipes에 넣으면 base/slots가 빠진 cva로 생성됨).
export const recipes = { button, group, absoluteCenter, spinner, input, badge, revealAnimation };
export const slotRecipes = { card, dialog, table, fieldset, field, checkbox, collapsible, fileUpload, clipboard };
```

**컨벤션**: `defineRecipe` → `recipes`, `defineSlotRecipe` → `slotRecipes`. recipe의 `jsx` 필드에 래퍼 컴포넌트 이름을 적는다(`button.ts`: `jsx: ["Button", "IconButton", "CloseButton", "ButtonGroup"]`). 색은 `colorPalette.*` semantic token만 쓴다.

### 3.3 story

UI 컴포넌트도 파일마다 `*.stories.tsx`를 둔다. variant가 있으면 `AllVariants` story에서 variant × size 매트릭스를 한 화면에 그린다(`button.stories.tsx`). story 문구는 한국어.

## 4. Panda 설정과 공유 preset, 다크모드

### 4.1 starter의 `panda.config.ts`

```ts
export default defineConfig({
  // Panda v2는 기본 preset을 자동으로 추가하지 않으므로 명시해야 한다.
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  preflight: true,
  include: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { animationStyles, recipes, slotRecipes, keyframes, layerStyles, textStyles,
    tokens: { colors, durations, zIndex },
    semanticTokens: {
      colors: { fg: { default: …, muted: …, subtle: … }, border: …, error: …,
                blue, gray: mauve, red, green, olive, tomato, amber, iris, brown },
      shadows, radii: { l1: "{radii.sm}", l2: "{radii.md}", l3: "{radii.lg}" } } } },
  outdir: "styled-system",
  jsxFramework: "react",
  globalCss, conditions,
});
```

- 팔레트(`src/theme/colors/*.ts`)는 Radix 색 스케일을 `defineSemanticTokens.colors`로 `_light`/`_dark` 값 쌍으로 담고, `solid/surface/subtle/outline/plain` 변형 토큰까지 정의한다. 그래서 recipe가 `colorPalette.solid.bg`만 써도 다크모드가 자동으로 맞는다.
- `fg.*`, `border`, `error`는 `_light`/`_dark`가 같은 참조(`{colors.gray.12}`)인데, `gray` 자체가 light/dark 쌍이라 결과적으로 다크모드를 따른다.
- `globalCss`에서 `html { colorPalette: "gray" }`, `body { background: "canvas", color: "fg.default", wordBreak: "keep-all" }` (`src/theme/global-css.ts`). `wordBreak: keep-all`은 한국어 줄바꿈용이므로 가져온다.
- `conditions.extend`에서 `light: ":root &, .light &"`로 덮고, `invalid`를 `:user-invalid, [data-invalid], [aria-invalid=true]`로 넓힌다(`src/theme/conditions.ts`). `dark`는 preset-base 기본(`.dark &`)을 그대로 쓴다.

### 4.2 이 레포에서의 컨벤션

1. `src/theme/*`와 `panda.config.ts`의 `theme`/`conditions`/`globalCss` 부분을 `packages/panda-preset`(이름은 09에서 확정)으로 옮기고 `definePreset`으로 내보낸다. Admin과 Site의 `panda.config.ts`는 `presets: ["@pandacss/preset-base", "@pandacss/preset-panda", cloudcorePreset]`와 `include`/`outdir`만 가진다. **starter는 preset을 패키지로 분리하지 않았다**. 분리는 이 레포가 새로 하는 일이다.
2. Site(Astro)에서는 `jsxFramework`가 다르거나 없을 수 있으므로, recipe의 `jsx` 힌트에 의존하지 않고 `css()`/recipe 함수 호출로도 쓸 수 있게 둔다.
3. 다크모드 초기화: starter `src/routes/__root.tsx`의 `THEME_INIT_SCRIPT`(localStorage `theme` = `light|dark|auto`, `auto`면 `prefers-color-scheme`, `<html>`에 `light`/`dark` 클래스와 `color-scheme` 지정)를 그대로 쓴다. SPA에서는 `index.html` `<head>`에 inline script로, Site에서는 Astro layout `<head>`에 `is:inline`으로 넣는다. 토글 상태(`light|dark|auto`)는 jotai atom(`atomWithStorage`) 하나로 둔다.
4. 시맨틱 토큰만 쓴다. 컴포넌트에서 `blue.9` 같은 원색 스케일을 직접 쓰지 않고 `colorPalette` + `fg.*`/`border`/`error`를 쓴다.
5. 테스트(`setupTest.ts`)와 Storybook(`preview.tsx`)은 둘 다 `styles.css`를 import한다. 스타일이 없으면 `visible` 판정이 달라질 수 있기 때문이다.

## 5. 클라이언트 상태: TanStack Query, jotai, bunja

### 5.1 TanStack Query (starter)

```ts
// src/integrations/tanstack-query/root-provider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    // 페이지를 오갈 때 이미 캐시된 데이터가 있으면 로딩 없이 바로 보여준다 —
    // 30초 안에는 그대로 쓰고, 그 이후엔 백그라운드에서 조용히 새로고침한다.
    queries: { staleTime: 30_000 },
  },
});
```

router context에 `queryClient`를 넣고(`createRootRouteWithContext<{ queryClient: QueryClient }>()`), `defaultPreload: "intent"`, `defaultPreloadStaleTime: 0`(`src/router.tsx`). starter에는 `useQuery`/`queryOptions` 사용 예가 **없다**.

**이 레포 컨벤션 (map.md + starter 기본값)**

- `staleTime: 30_000`, `defaultPreload: "intent"`, `defaultPreloadStaleTime: 0`(preload 캐시를 Query에 맡김)을 가져온다.
- `queryOptions(...)` 팩토리는 `apps/admin/src/api/`(가칭)에 `hc` 호출과 함께 둔다. 라우트 `loader`에서 `context.queryClient.ensureQueryData(opts)`, 컴포넌트에는 `opts`를 props로 넘기고 컴포넌트는 `useSuspenseQuery(props.postQuery)`만 한다. 컴포넌트는 `hc`를 import하지 않는다.
- 테스트에서는 테스트마다 새 `QueryClient`(`retry: false`)를 만드는 render 래퍼를 쓴다(6.2절).

### 5.2 jotai

starter는 쓰지 않으므로 규칙만 정한다.

- 앱 전역의 작은 UI 상태(테마 모드, 사이드바 접힘 등)만 모듈 수준 atom으로 둔다.
- 테스트 격리를 위해 앱 루트와 테스트 render 래퍼 모두 `<Provider store={createStore()}>`를 쓴다. 기본 store(Provider 없는 모드)에 의존하지 않는다.
- 서버 데이터는 jotai에 두지 않는다(TanStack Query). starter가 설치한 `jotai-tanstack-query`는 쓰지 않는다. 필요한 곳이 생기면 그때 ADR로 남긴다.

### 5.3 bunja 핵심 개념 (bunja README, `bunja/react.ts`)

| 개념 | 요점 |
| --- | --- |
| `bunja(() => {...})` | 수명이 있는 상태 정의. 렌더 트리 어딘가에서 처음 의존할 때 인스턴스가 생기고, 의존하는 곳이 모두 사라지면 파괴된다. |
| `bunja.effect(() => cleanup)` | 수명 시작/끝에 실행. 외부 자원(타이머, 구독, 소켓)은 반드시 여기서 만든다(`store.prebake`가 init 함수를 dry-run으로 부르기 때문). |
| `bunja.use(dep)` | 다른 bunja나 Scope에 의존. Rules of Hooks처럼 **무조건, 같은 순서로** 호출. 넓은 수명의 bunja effect가 먼저 시작하고 먼저 정리된다. |
| `bunja.will(dep)` | 조건부 의존. thunk를 받아 같은 init 안에서만 호출. |
| `bunja.withSeed(defaultSeed, (seed) => …)` | 첫 인스턴스 생성 시의 초기 데이터. 인스턴스 identity에 들어가지 않으며, 이미 있으면 무시된다. |
| `createScope<T>()` + `Scope.bind(v)` | scope 값마다 별도 인스턴스. `useBunja(b, [PostIdScope.bind(id)])`처럼 직접 주입하거나 |
| `createScopeFromContext(Ctx)` / `bindScope(scope, Ctx)` | React context에 묶어 Provider 값으로 주입. React 19에서는 `React.use`로 필요한 context만 lazy하게 읽는다. |
| `BunjaStoreProvider` | 컴포넌트 트리마다 새 `BunjaStore`. 언마운트 시 `store.dispose()`. **Provider가 없으면 모듈 수준 기본 store를 공유**하므로 테스트 격리에 필요하다. |
| `useBunja` 언마운트 | `delayUnmount(mount)`로 `setTimeout(unmount, 0)` 뒤에 정리한다. 테스트에서 dispose 효과를 확인하려면 한 task를 기다려야 한다. |

jotai와 함께 쓰는 공식 예(`examples/timer`):

```ts
// examples/timer/src/state/jotai-store.ts
export const JotaiStoreScope = createScope<JotaiStore>();

// examples/timer/src/state/app.ts
export const appBunja = bunja(() => {
  const store = bunja.use(JotaiStoreScope);
  const itemsAtom = atom<Item[]>([]);
  function remove(id: number) {
    store.set(itemsAtom, store.get(itemsAtom).filter((item) => item.id !== id));
  }
  return { itemsAtom, addTimer, addCountdown, remove };
});
```

```tsx
// examples/timer/src/main.tsx (요지)
bindScope(JotaiStoreScope, JotaiStoreContext);
<JotaiProvider store={jotaiStore}>
  <JotaiStoreContext.Provider value={jotaiStore}>
    <BunjaStoreProvider>…</BunjaStoreProvider>
  </JotaiStoreContext.Provider>
</JotaiProvider>
```

```tsx
// examples/timer/src/Timer.tsx — scope 값(id)마다 독립 인스턴스, 하위 컴포넌트에는 atom을 props로
const { timerAtom, start, stop, titleAtom, editingTitleAtom } = useBunja(timerBunja, [ItemScope.bind(id)]);
<TitleEditor titleAtom={titleAtom} editingTitleAtom={editingTitleAtom} icon="⏱️" />
```

**이 레포 컨벤션**

1. bunja는 "atom 묶음 + 명령 함수 + effect"를 반환한다. 상태 값은 jotai atom에 두고, 명령 함수는 `JotaiStoreScope`로 받은 store로 `get`/`set`한다(timer 예제와 같음).
2. 에디터 세션: `editorSessionBunja`는 `PostIdScope`에 의존하고, 자동 저장 큐 bunja가 `bunja.use(editorSessionBunja)`로 넓은 수명에 매단다. 다이얼로그 세션은 다이얼로그 컴포넌트 안에서 `useBunja`해서 닫히면 사라지게 한다.
3. 외부 I/O(자동 저장 요청 등)는 bunja가 직접 `hc`를 부르지 않는다. `SaveFnScope` 같은 scope로 함수를 주입받는다. 테스트에서는 기록용 평범한 함수를 bind한다(oxlint가 `vi.fn`을 막는다, 7절).
4. 테스트 render 래퍼는 매번 `BunjaStoreProvider` + 새 jotai store + 그 store를 담은 `JotaiStoreContext`를 깐다.
5. 버전: starter는 `bunja ^3.0.1`(npm latest). 레포 main의 package.json은 2.0.0으로 적혀 있지만 README의 API(`withSeed`, `will`, `prebake`)는 3.x 기준으로 보인다. 09에서 3.0.1 설치 후 README 예제가 그대로 타입체크되는지 확인한다.

## 6. 테스트: Vitest browser + `@siheom/react`, Storybook

### 6.1 Vitest 설정 (starter `vite.config.ts`)

```ts
test: {
  projects: [
    {
      extends: true,
      resolve: { alias: fakeAliases },
      test: {
        setupFiles: ["src/setupTest.ts"],
        name: "browser",
        include: ["src/**/*.test.{ts,tsx}"],
        browser: { enabled: true, headless: true, provider: playwright({}), instances: [{ browser: "chromium" }] },
      },
    },
    { extends: true, test: { name: "server", environment: "node", include: [/* domain, persistence, api */] } },
  ],
},
```

- browser project에서 **`resolve.alias: fakeAliases`**로 가짜 모듈을 바꿔 끼운다. Storybook `viteFinal`도 같은 `fakeAliases`를 앞에 붙인다(`.storybook/main.ts`). 테스트와 Storybook이 같은 가짜를 본다.
- 이 레포: Admin은 browser project 하나, 순수 로직(`packages/*`)은 node project, API는 `@cloudflare/vitest-pool-workers` project로 나눈다.

### 6.2 `setupTest.ts`

```ts
// src/setupTest.ts
import { cleanupReactRoots } from "@siheom/react";
import { configure } from "@testing-library/dom";
import "./styles.css";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;   // React 19 browser test
// siheom의 찾기·기다리기는 Testing Library의 waitFor를 쓴다. 기본 1초는 … lazy 모듈을 처음 불러오는 시간보다 짧다.
configure({ asyncUtilTimeout: 3000 });
afterEach(async () => { await cleanupReactRoots(); });
```

그대로 가져온다. 에디터(Lexical) 같은 무거운 lazy 모듈이 있으므로 `asyncUtilTimeout: 3000`도 유지한다.

Provider가 필요한 render는 siheom 공식 방식대로 `given.render`를 확장한 헬퍼 모듈을 만든다(`apps/docs/concepts/given.md`, `apps/docs/getting-started/react.md`):

```ts
// apps/docs/getting-started/react.md
const { runSiheom, given, actions, assertions, query } = extendSiheom(
  { actions: defaultActions, assertions: defaultAssertions,
    givens: { render: async (ui) => { render(<Providers>{ui}</Providers>); } } },
  {},
);
```

이 레포에서는 `apps/admin/src/test/siheom.tsx`(가칭)에서 `Providers` = 새 `QueryClient` + jotai `Provider`/`JotaiStoreContext` + `BunjaStoreProvider`(+ 필요하면 메모리 history 라우터)로 묶어 export하고, 테스트는 `@siheom/react` 대신 이 모듈에서 import한다. render를 `overrideSiheom`으로 감쌀 때는 `effects`(`reactEffects`)와 `fakeTimerScope`를 base에 남긴다(`apps/docs/ai-agent.md`).

### 6.3 시험 작성 규칙 (`@siheom/react`)

예 (starter `src/stories/ExampleForm.test.tsx`):

```tsx
it("새 데이터를 추가할 수 있다", async () => {
  let result: ValidData | undefined;
  await runSiheom(
    given.render(<ExapmleForm {...Stories.Empty.args} addData={async (data) => { result = data; }} />),
    actions.fill(query.textbox("이름"), "김태희"),
    actions.click(query.checkbox("약관 동의")),
    actions.click(query.button("추가하기")),
  );
  expect(result).toStrictEqual({ __brand: "ValidData", consent: true, name: "김태희" });
});
```

타이머가 있는 UI (starter `src/components/form/submit-button.test.tsx`):

```tsx
await runSiheom(
  given.render(renderSlowForm()),
  withFakeTimers(
    actions.click(query.button("제출")),
    assertions.disabled(query.button(/.*/)),
    effect.elapsed(200),
    assertions.visible(query.button("제출")),
  ),
);
```

**컨벤션**

1. 시험은 `runSiheom(given…, actions…, assertions…)` 스텝 데이터로 쓴다. 화면으로 확인할 수 있는 것은 `assertions.*`로 확인한다.
2. 콜백 결과(제출값 등)를 확인할 때만 `await runSiheom(...)` 뒤에 `expect`를 쓴다. 그 외에는 siheom 문서 권장대로 `return runSiheom(...)`. (siheom 문서 `concepts.md`는 "본문에 await를 쓰지 않는다"고 하지만 starter와 siheom 자체 예제 `examples/save-feedback.md`는 `await runSiheom`을 쓴다. 둘 다 허용하되 위 기준으로 고른다.)
3. locator는 `query.<role>(accessibleName)`만 쓴다. CSS 선택자, test id 금지. 이름이 겹치면 `query.within(query.dialog("…"), …)`.
4. Ark UI 특이점: Select trigger는 `query.combobox("레이블")`(`query.label` 아님), 폼 값은 `HiddenSelect`/`HiddenInput`이 있어야 FormData에 들어간다. `Select.ValueText placeholder=""`로 placeholder가 name에 섞이지 않게 한다(`apps/docs/guides/headless-components.md`).
5. 키보드 시퀀스(`{ArrowDown}{Enter}`)로 클릭을 우회하지 않는다. 실패하면 리포트의 `[A11y Snapshot]`을 먼저 보고 컴포넌트 a11y를 고친다.
6. 타이머는 `withFakeTimers` + `effect.elapsed`. 전역 `vi.useFakeTimers` 금지. 자동 저장 간격 테스트가 여기에 해당한다.
7. 에러 메시지는 `assertions.errormessage(query.textbox("이름"), "이름을 입력해주세요")`로 확인한다. 이것이 2.1절의 aria 배선을 강제한다.
8. 테스트 이름은 한국어로 사용자 관점에서 쓴다("아무 값도 입력하지 않고 추가할 수 없다").
9. story args를 테스트에서 재사용한다: `<X {...Stories.Empty.args} onSubmit={…} />`. story가 fixture 역할을 한다.
10. 버전: starter는 `@siheom/react ^0.3.0`, 현재 레포는 0.4.0. 이 레포는 0.4.x로 시작한다(CHANGELOG 확인은 09에서).

### 6.4 한국어 IME (`@siheom/ime`) — 에디터에 그대로 쓸 수 없다

`@siheom/ime`는 `createImeActions()`가 반환한 `{ fill, type }`을 `overrideSiheom`으로 끼워 넣는 방식이다.

```ts
// apps/docs/guides/ime.md
const runSiheom = overrideSiheom(
  { actions: createDefaultActions(), assertions: createDefaultAssertions(),
    givens: defaultGivens, effects: { ...defaultEffects, ...reactEffects } },
  { actions: createImeActions({ profile: "linux-chrome-ibus-hangul" }),
    givens: { render: async (element: React.ReactElement) => { render(element); } } },
);
```

- 프로필: 기본 `linux-chrome-ibus-hangul`. 옵션 또는 `SIHEOM_IME_PROFILE` 환경 변수로 바꾼다. `macos-chrome-apple`, `macos-safari(-apple)`, `windows-chrome-ms`, `windows-firefox-ms`, `android-chrome` 등 내장.
- 실험적 패키지라 API가 바뀔 수 있다(문서 tip).
- **중요**: 가이드는 "`contenteditable`은 현재 `user-event` type으로 폴백합니다. input/textarea 조합이 주 대상입니다"라고 적고 있고, `packages/ime/plan.md`에도 "Contenteditable targets fall back to user-event type"이 의도된 동작으로 체크되어 있다. 소스(`packages/ime/src/createImeActions/createImeActions.ts`)에는 `contenteditable-firefox-broken/fixed`, Android Firefox + Slate 전용 compose mode만 있다. 즉 **Chromium 기본 프로필로 Lexical/Koenig(contenteditable)에 한글을 치면 조합 이벤트 없이 user-event로 들어간다**.
- 대안: `@siheom/ime-cdp`(`createCdpImeActions`)는 Chromium CDP `Input.imeSetComposition`으로 실제 엔진 경로를 탄다. contenteditable 지원 여부는 문서/plan에 명시가 없다. Lexical 관련 조사(`docs/research/lexical-android-firefox-composition.md`)는 Android Firefox 버그 분석이고 Chromium 테스트 경로는 아니다.

**컨벤션 (잠정)**

1. 제목, slug, 태그 입력, 검색 등 input/textarea는 `@siheom/ime`로 IME 시험을 쓴다. 특히 Enter로 제출/태그 추가하는 필드는 6.4 가이드의 "Enter-submit" 패턴(조합 중 Enter 무시, `compositionend` 직후 Enter 한 번 삼키기)을 테스트로 고정한다.
2. 에디터 본문(contenteditable)은 09 prototype에서 `@siheom/ime-cdp`로 Lexical에 `김태희`가 조합 이벤트와 함께 들어가는지 먼저 확인한다. 안 되면 map.md의 "에디터 한국어 입력은 `@siheom/ime`로 테스트" 결정을 다시 열어야 한다(→ 맵에 보고).

### 6.5 Storybook (starter `.storybook/`)

- framework `@storybook/tanstack-react`, addons: `@chromatic-com/storybook`, `@storybook/addon-vitest`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/addon-mcp`.
- `preview.tsx`: `import "@/styles.css"`, `a11y.test: "todo"`(위반을 UI에만 표시).
- `viteFinal`에서 `fakeAliases`를 alias 맨 앞에 넣는다.

이 레포 차이: framework는 SPA라도 TanStack Router `Link`를 쓰는 컴포넌트가 있으므로 `@storybook/tanstack-react`를 유지할지 `@storybook/react-vite`로 갈지 09에서 정한다. `@chromatic-com/storybook`은 GitHub Actions/Chromatic을 쓰지 않으므로 뺀다. `a11y.test`는 처음부터 `"error"`를 고려한다(siheom이 a11y에 의존하므로).

## 7. 가짜(fakes)와 mock 금지

starter의 가장 강한 컨벤션이다. oxlint가 강제한다.

```jsonc
// .oxlintrc.json
"plugins": ["typescript", "unicorn", "oxc", "vitest"],
"categories": { "correctness": "error" },
"rules": {
  "vitest/no-restricted-vi-methods": ["error", {
    "mock": "모듈을 바꿔치기하지 마세요. 의존성을 props로 받거나, fake-aliases.ts로 가짜 구현체(*.fake.ts)를 연결하세요.",
    "spyOn": "스파이 대신 의존성을 주입하고 결과(화면·반환값)를 확인하세요.",
    "stubGlobal": "전역을 바꾸지 말고 의존성을 주입하세요.",
    "stubEnv": "환경 변수를 바꾸지 말고 설정을 주입하세요.",
    "fn": "vi.fn 대신 호출을 변수에 기록하는 평범한 함수를 넘기세요.",
    /* doMock, unmock, hoisted, unstubAllGlobals 도 금지 */
  }],
  "vitest/expect-expect": ["error", { "assertFunctionNames": ["expect", "runSiheom"] }],
  "vitest/no-conditional-expect": "off",
  "vitest/require-to-throw-message": "off"
}
```

- 1순위는 **props 주입**(`onSubmit`, `queryOptions`, 저장 함수). 2순위는 브라우저/Storybook에 없는 외부 모듈을 `src/fakes/<pkg>.fake.tsx`로 만들고 `fake-aliases.ts`에서 alias로 연결.
- 가짜는 사람이 조작할 수 있는 UI를 가진다. 예: QR 스캐너 가짜는 "카메라에 비친 QR" 입력칸과 [비추기]/[카메라 권한 거부] 버튼을 그린다(`src/fakes/react-qr-scanner.fake.tsx`). 그래서 siheom 시험과 Storybook 모두에서 같은 방식으로 조작한다.
- starter의 `fake-aliases.ts`는 지금 빈 배열이다(QR 가짜는 남아 있지만 연결은 주석 처리). 형식은 `{ find, replacement }` 배열이고, `fileURLToPath(new URL(path, import.meta.url))`로 경로를 만든다.
- 이 레포에서 가짜 후보: 업로드(R2 presign 대신 로컬 Blob URL), passkey(WebAuthn) 프롬프트, oEmbed fetch. 대부분은 props 주입으로 충분하므로 alias는 정말 모듈 경계일 때만 쓴다.
- API 쪽(`@cloudflare/vitest-pool-workers`)도 같은 규칙(`vi.mock` 금지)을 적용한다. D1/R2는 miniflare 실물 binding을 쓴다.

## 8. 포맷/린트/타입체크

- oxfmt: `.oxfmtrc.json`은 `$schema`와 빈 `ignorePatterns`뿐이다 = **기본값 사용**. starter 코드는 큰따옴표, 세미콜론, 2칸 들여쓰기, 줄 길이 100 정도로 보인다(`simple-field.tsx`의 긴 줄). 이 레포도 기본값을 쓰고, 생성물(`styled-system/`, `routeTree.gen.ts`, `worker-configuration.d.ts`)만 `ignorePatterns`에 넣는다.
- oxlint: 위 7절 설정을 그대로 가져오고 `"react"`, `"jsx-a11y"` 플러그인 추가를 09에서 검토한다(starter에는 없음).
- 스크립트 이름: `lint`, `lint:fix`, `format`, `typecheck`, `test`, `storybook`, `generate-routes`를 그대로 쓴다. `prepare: "panda codegen --clean"`도 가져온다(설치 직후 `styled-system` 생성).
- tsconfig: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`, `allowImportingTsExtensions`. `lib`에 `ESNext.Disposable`이 있다(`using` 문).

## 9. 기타 작은 유틸

- `src/lib/invariant.ts`: `asserts condition` 형태의 invariant. 그대로 가져온다.
- `src/lib/standard-schema.ts`: `parseStandardSchemaV1(schema, data)`(동기, 실패 시 `StandardSchemaV1Error` throw), `summarizeStandardSchemaV1Issues` (issue path → 메시지 맵). map.md의 "모든 경계에서 parse"에 쓰기 좋다. 다만 valibot만 쓰면 `v.parse`로 충분하므로, 공유 패키지에서는 valibot을 직접 쓰고 Standard Schema 헬퍼는 폼/라우터 경계처럼 라이브러리가 Standard Schema를 요구하는 곳에만 둔다.

---

## 10. 09 prototype에서 확인할 것

1. TanStack Router SPA(Start 없이) + `@tanstack/router-plugin` + Panda + Storybook framework 조합이 starter 설정에서 Start/nitro를 걷어낸 채로 동작하는가.
2. Panda preset을 workspace 패키지로 분리했을 때 Admin(React)과 Site(Astro) 양쪽에서 codegen이 recipe/slotRecipe를 제대로 만드는가.
3. `@siheom/ime-cdp`로 Lexical(contenteditable)에 한글 조합 입력이 재현되는가. 안 되면 map.md의 IME 테스트 결정을 다시 연다.
4. bunja 3.0.1에서 README API(`withSeed`, `will`)와 `BunjaStoreProvider`가 React 19 + 테스트 render 래퍼에서 격리되는가. `delayUnmount`의 `setTimeout(0)` 때문에 `withFakeTimers` 안에서 dispose 확인이 어떻게 되는가.
5. siheom 0.4 `extendSiheom`/`overrideSiheom`으로 Providers + IME를 한 헬퍼에 같이 넣을 수 있는가.
