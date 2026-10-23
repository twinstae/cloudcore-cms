# modern-react-starter, siheom-ts, bunja에서 어떤 컨벤션을 가져올 것인가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

참고 자료에서 Admin에 그대로 가져올 컨벤션을 정리한다.
- `../modern-react-starter`: `SimpleForm`/`SimpleField`(simple-field.tsx, simple-form.tsx)의 구조와 valibot resolver 연결, `components/ui`(Ark UI + Panda recipe) 구성, `panda.config.ts`와 preset, `story-utils.tsx`, `fakes/`, `setupTest.ts`, Storybook과 Vitest 설정, jotai/bunja 사용 예, TanStack Query 사용 방식, oxlint/oxfmt 설정, tsr 설정
- https://github.com/twinstae/siheom-ts: `@siheom/react` 테스트 작성 방식과 예제, `@siheom/ime`
- https://github.com/disjukr/bunja: 핵심 개념(bunja, scope, 생명주기)과 React 연동, jotai와 함께 쓰는 예

결과는 "이 레포가 따를 컨벤션 초안" 형태의 research 문서로 남기고 이 티켓에서 링크한다. 이 문서는 09 prototype의 입력이 된다.

## Answer

- 폼: starter의 `SimpleForm`(Standard Schema → `standardSchemaResolver`, valibot 스키마 그대로) + `Simple*` 필드(`useFormContext`+`Controller`, value/onChange 없음, `aria-invalid/-describedby/-errormessage` 배선) + `SubmitButton`(`isSubmitting`)을 그대로 가져온다. 필드 story는 `FormFieldStory`로 Default/WithHint/Required/WithValue/Disabled/Invalid를 맞춘다.
- UI: Ark UI 파츠를 `createSlotRecipeContext`의 `withProvider/withContext`로 감싸 namespace export. `defineSlotRecipe`는 반드시 `slotRecipes`에 등록(Panda v2 codegen). Park UI `components.json` 유지.
- Panda: v2는 preset 자동 추가가 없어 `preset-base`/`preset-panda` 명시. Radix 팔레트를 `_light/_dark` semantic token으로 두고 `colorPalette.*`만 쓴다. starter는 preset을 패키지로 분리하지 않았으므로 Admin/Site 공유 preset 분리는 이 레포가 새로 한다. 다크모드 초기화는 starter `THEME_INIT_SCRIPT`(localStorage `theme`=light|dark|auto) 재사용.
- 테스트: Vitest browser(Playwright chromium) project + `setupTest.ts`(`IS_REACT_ACT_ENVIRONMENT`, `asyncUtilTimeout: 3000`, `cleanupReactRoots`). 시험은 `runSiheom` 스텝 데이터, `query.<role>(name)`만, 타이머는 `withFakeTimers`+`effect.elapsed`. Provider는 `extendSiheom`으로 `given.render` 확장 헬퍼에 QueryClient/jotai/BunjaStoreProvider를 묶는다. story args를 테스트 fixture로 재사용.
- mock 금지: oxlint `vitest/no-restricted-vi-methods`로 `vi.mock/spyOn/fn/stubGlobal` 등을 막고, props 주입 → 안 되면 `src/fakes/*.fake.tsx` + `fake-aliases.ts` alias(테스트와 Storybook 공유). `expect-expect`에 `runSiheom` 등록.
- oxfmt는 기본값, oxlint는 correctness=error + vitest 규칙. 품질 게이트는 starter `ci` 스크립트 대신 lefthook pre-push(fix 없는 lint, `oxfmt --check`).
- TanStack Query: `staleTime: 30_000`, router context에 queryClient, `defaultPreload: "intent"`, `defaultPreloadStaleTime: 0`. starter엔 `queryOptions` 사용 예가 없어 "라우트가 `queryOptions` 주입, 컴포넌트는 `useSuspenseQuery`"는 이 레포 규칙으로 새로 정함.
- jotai/bunja: starter는 의존성만 있고 **사용 예가 없다**. bunja `examples/timer` 패턴(`JotaiStoreScope`로 jotai store 주입, bunja는 atom+명령 함수+`bunja.effect` 반환, `ItemScope.bind(id)`로 인스턴스 분리, `BunjaStoreProvider`로 격리)을 기준으로 삼는다. 외부 I/O는 scope로 함수 주입.
- 놀라운 점: `@siheom/ime`는 **contenteditable을 기본(Chromium) 프로필에서 user-event로 폴백**한다(가이드와 plan.md에 명시). Lexical/Koenig 본문 한글 입력은 그대로는 IME 에뮬레이션이 안 된다. 09에서 `@siheom/ime-cdp`(CDP 실제 IME)로 확인하고, 안 되면 map의 IME 테스트 결정을 다시 열어야 한다.
- 갈리는 지점: starter는 TanStack Start+nitro, Elysia/Eden, Postgres/PGlite, Chromatic addon을 쓴다. 이 레포는 Router SPA + Hono `hc` + D1(vitest-pool-workers)이므로 해당 부분은 가져오지 않는다. starter story는 `@storybook/react-vite`에서 타입을 import하지만 framework는 `@storybook/tanstack-react`라 통일 필요.
- 버전: `@siheom/react` 0.4.0(starter는 ^0.3.0), `@siheom/ime` 0.3.1(실험적), bunja npm 3.0.1(레포 package.json은 2.0.0 표기).

Context: 브랜치 `research/reference-conventions`, 파일 `research/07-reference-conventions.md` (10절에 09 prototype 확인 목록).
