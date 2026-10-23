# 에디터 후보(Koenig, Lexical, Tiptap)와 `@siheom/ime` 조사

- 티켓: `.scratch/cms-rewrite/issues/05-research-editor-candidates.md`
- 조사일: 2026-10-23
- 표기: **[검증]** = 이 조사에서 직접 실행하거나 패키지 소스를 열어 확인함. **[출처]** = 1차 출처(공식 저장소, npm 메타데이터, 공식 문서)를 읽고 확인함. **[미검증]** = 추론이거나 실행해 보지 않음.
- 실험 코드는 저장소 밖 scratchpad에서만 돌렸다. prototype은 만들지 않았다.

## 0. 요약

1. **Koenig는 Ghost 밖에서도 쓸 수 있지만, Lexical `0.13.1`(2024-01-26)에 고정되어 있다.** 현재 Lexical은 `0.52.0`이다. Ghost 이슈 [#29220](https://github.com/TryGhost/Ghost/issues/29220)(open, Ghost 6.36)에 따르면 **빈 문단 맨 앞에서 한글 입력이 안 된다**. 조사한 사람은 원인이 고정된 Lexical 버전의 composition 처리라고 분석했다. 한국어만 지원하는 이 제품에는 가장 큰 위험이다.
2. Ghost의 서버 렌더러(`@tryghost/kg-lexical-html-renderer`)는 **Workers(workerd)에서 돌아간다** [검증]. 다만 `jsdom` 대신 `linkedom`을 `dom` 옵션으로 넘겨야 하고, `nodejs_compat` 플래그를 켜고 wrangler `alias`로 `jsdom`을 막아야 한다. 이렇게 하지 않으면 jsdom이 함께 번들되어 13.7 MiB(gzip 1.8 MiB)가 된다.
3. **Lexical 0.52를 직접 쓰는 경우**에도 `$generateHtmlFromNodes`는 DOM이 필요하다. `@lexical/headless/dom`의 `withDOM`은 wrangler 번들에서 browser 빌드로 해석되므로 happy-dom이 들어가지 않는다. 결국 `linkedom`으로 `globalThis.window/document`를 직접 넣어야 workerd에서 동작한다 [검증].
4. **Tiptap 3**의 `@tiptap/static-renderer`는 DOM 없이, `nodejs_compat` 없이도 workerd에서 HTML을 만든다 [검증]. 서버 렌더 쪽은 셋 중 가장 단순하다.
5. **`@siheom/ime` 0.3.1은 기본 프로필(`linux-chrome-ibus-hangul`)에서 contenteditable 대상이면 composition을 흉내 내지 않고 `user-event.type`으로 폴백한다** [출처/소스]. contenteditable용 player는 Firefox/Slate 계열 프로필에만 있다. map.md의 "에디터 한국어 입력은 `@siheom/ime`로 테스트"는 그대로는 성립하지 않는다(§5).

---

## 1. Koenig (`@tryghost/koenig-lexical`)

### 1.1 배포와 저장소 상태

| 항목 | 값 | 근거 |
|---|---|---|
| 최신 버전 | `1.13.0` (npm modified 2026-10-15) | [출처] `npm view @tryghost/koenig-lexical` |
| 라이선스 | MIT | [출처] npm, `TryGhost/Ghost` LICENSE |
| 저장소 | `TryGhost/Koenig`는 **archived**. 코드는 Ghost 모노레포 `koenig/`로 합쳐짐 | [출처] https://github.com/TryGhost/Koenig README, https://github.com/TryGhost/Ghost/tree/main/koenig |
| npm 배포 정책 | "The npm-published versions exist for external consumers only". Ghost 안정 릴리스 태그마다 publish workflow가 돈다 | [출처] `koenig/README.md` "Shipping" |
| 유지보수 | 활발하다. Ghost에 2026-10-22 기준 koenig-lexical 관련 PR이 열려 있다(예: #29218 "Migrated koenig-lexical to TypeScript", #32154). Ghost Admin이 직접 쓰는 제품 코드다 | [출처] GitHub PR 검색 |

### 1.2 Ghost 밖에서 독립 사용

- 가능하다. `koenig-lexical`에는 Ghost 없이 돌아가는 standalone demo(`pnpm dev`, `demo/DemoApp.tsx`)가 있다 [출처].
- 공개 API(번들 export에서 추출) [검증]: `KoenigComposer`, `KoenigEditor`, `KoenigComposableEditor`, `KoenigNestedComposer`, `KoenigCardWrapper`, `DEFAULT_NODES`, `BASIC_NODES`, `MINIMAL_NODES`, `AllDefaultPlugins`, Card별 `*Plugin`(`ImagePlugin`, `CalloutPlugin`, `EmbedPlugin`, `HtmlPlugin`, `ButtonPlugin`, `CallToActionPlugin`, `HorizontalRulePlugin` …), `CardMenuPlugin`, `SlashCardMenuPlugin`, `PlusCardMenuPlugin`, `FloatingToolbarPlugin`, `HtmlOutputPlugin`, `WordCountPlugin`, `MarkdownShortcutPlugin`, `*_TRANSFORMERS` 등.
- `KoenigComposer` props [출처: `src/components/KoenigComposer.tsx`]: `initialEditorState`, `nodes`(기본 `DEFAULT_NODES`), `onError`, `fileUploader`, `cardConfig`, `darkMode`, `enableMultiplayer`(yjs + y-websocket), `isTKEnabled`, `multiplayer*`.
- `cardConfig`는 Ghost 전용 값을 많이 받는다(demo 기준): `fetchEmbed`, `unsplash`, `klipy`, `fetchAutocompleteLinks`, `searchLinks`, `siteTitle`, `siteUrl`, `membersEnabled`, `stripeEnabled`, `feature`, `deprecated` … [출처: `demo/DemoApp.tsx`]. 우리 Card 7종에 필요한 것은 주로 `fetchEmbed`이다. 나머지는 생략해도 되는지 [미검증].
- **UI 문자열은 영어로 하드코딩**되어 있고 i18n 라이브러리가 없다(번들에 `i18next`/`useTranslation` 0건, placeholder `"Begin writing your post..."`) [검증]. Card 메뉴 라벨(`kgMenu.label`)도 영어다. 한국어 UI를 원하면 노드 subclass나 패치가 필요하다.

### 1.3 React 19 호환성

- `package.json`에 **`peerDependencies`와 `dependencies`가 모두 없다**. 그런데 번들(ESM)은 `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`를 external로 import한다 [검증]. 즉 React는 호스트가 제공해야 하는데 버전 범위는 선언되어 있지 않다.
- Ghost 모노레포 catalog의 React는 `18.3.1`이다(`pnpm-workspace.yaml`) [출처]. 번들 안의 `@lexical/react@0.13.1`도 `react@18.3.1`로 빌드되었다(번들 region 주석) [검증].
- React 19에서 제거된 API를 정적으로 찾아봤다. `findDOMNode` 0건, `SECRET_INTERNALS` 0건. `.defaultProps`는 class 컴포넌트(`ReactSlider`)와 번들된 JSX 팩토리 코드에만 있다 [검증]. 정적으로 보면 큰 장애물은 없어 보인다.
- **React 19에서 실제로 마운트해 보지는 않았다 [미검증].** prototype 티켓에서 확인해야 한다.

### 1.4 번들 방식

- `dist/koenig-lexical.js`(ESM, 3.47 MB), `dist/koenig-lexical.umd.js`(UMD, 2.9 MB), `dist/style.css`(118 KB). `exports`: `"."` → import ESM / require UMD, `"./style.css"` [검증].
- Lexical 0.13.1 전체, `@lexical/react` 0.13.1, yjs, SimpleMDE fork(markdown card), Unsplash selector, emoji picker, SVG 아이콘이 **모두 번들 안에 들어 있다** [검증]. 이 때문에 Admin에서 별도로 `lexical`을 설치하면 Lexical 인스턴스가 두 개가 된다. Koenig 내부 노드는 Koenig 번들 안의 Lexical로만 다뤄야 한다 [미검증, 구조상 추론].
- README: "styles are included inside the JS file rather than being separate to allow for a single import". 번들 안에서 `<style>`을 만들어 넣는 코드가 확인된다 [출처/검증].

### 1.5 기본 Card 목록과 우리 Card 7종 매핑

`DEFAULT_NODES` [출처: `src/nodes/DefaultNodes.ts`]: ExtendedText/Heading/Quote, List/ListItem, Aside, Link, **CodeBlock**, **HorizontalRule**, **Image**, Markdown, Audio, Video, **Callout**, **Html**, File, **Button**, **CallToAction**, Toggle, Header, Bookmark, Paywall, Product, Email, EmailCta, **Embed**, Gallery, Signup, Transistor, TK, AtLink, AtLinkSearch, ZWNJ.

| 우리 Card | Koenig 노드 type | 비고 |
|---|---|---|
| image | `image` | `fileUploader` 필요 |
| code | `codeblock` | |
| embed | `embed` | `cardConfig.fetchEmbed(url, {type})`가 oEmbed 결과를 준다 |
| callout | `callout` | `calloutText`는 nested editor의 **HTML 문자열**로 직렬화된다 |
| divider | `horizontalrule` | |
| html | `html` | |
| CTA 버튼 | `button` (또는 `call-to-action`) | `call-to-action`은 Ghost 이메일/스폰서 성격이 강하다 |

### 1.6 Card를 추가하거나 빼는 방법

- **빼기**: Card 메뉴는 등록된 노드의 static `kgMenu`로 만들어진다(`buildCardMenu(nodes, …)`가 `node.kgMenu`를 순회) [출처: `src/utils/buildCardMenu.ts`]. 따라서 `KoenigComposer`의 `nodes`에 원하는 노드만 넘기고, `KoenigEditor`(=`AllDefaultPlugins` 포함) 대신 `KoenigComposableEditor`에 필요한 `*Plugin`만 자식으로 넣으면 된다. demo의 `basic`/`minimal` 모드가 이 패턴을 쓴다 [출처: `demo/DemoApp.tsx`].
- **추가**: Koenig 노드 패턴을 따른다. `@tryghost/kg-default-nodes`의 base 노드(데이터, `exportJSON`, 서버용 `exportDOM`)를 만들고, editor 쪽에서 subclass로 `static kgMenu`, `decorate()`(React 컴포넌트 + `KoenigCardWrapper`), `INSERT_*_COMMAND`, `*Plugin`을 추가한다(`CalloutNode.tsx` 참고) [출처]. 서버 렌더러에서도 같은 노드를 써야 하므로 **노드 정의는 Lexical 0.13.1 API에 묶인다**.
- 메뉴 항목의 `isHidden({config})`, `postType`으로 메뉴 항목을 조건부로 숨길 수 있다 [출처].

### 1.7 스타일 (Tailwind, Panda와 충돌 여부)

- Koenig는 **Tailwind v3**(`tailwindcss: catalog:tailwind3` = 3.4.19)로 빌드된다 [출처]. 소비자가 Tailwind를 설치할 필요는 없다. 결과 CSS가 번들에 들어 있다.
- 모든 규칙이 `.koenig-lexical` 아래로 scope되어 있다. preflight도 `.koenig-lexical *, …`, utility도 `.koenig-lexical .flex{display:flex}` 식이다 [검증: `dist/style.css`]. Panda의 atomic class(`d_flex` 등)와 이름이 겹치지 않는다.
- Panda는 `@layer reset, base, tokens, recipes, utilities`로 내보낸다. Koenig CSS는 layer 밖에 있으므로 cascade상 **Koenig 규칙이 Panda 규칙보다 우선**한다. 에디터 내부를 Panda로 꾸미려 할 때 이것이 마찰이 된다 [미검증, CSS cascade 규칙에 근거한 추론].
- 다크모드: `.dark .koenig-lexical …` 규칙이 214개 있고, `darkMode` prop이 있다 [검증]. Panda의 dark condition(예: `[data-theme=dark]` 또는 `.dark`)과 맞춰야 한다. Koenig는 `.dark` class 조상을 기대한다.
- 본문 폰트는 `--kg-font-body`, `--kg-font-heading` 등 CSS 변수로 바꿀 수 있다 [출처: README]. 기본값은 Georgia/Inter라서 한글 폰트를 지정해야 한다.
- Site 쪽: `kg-default-nodes`의 `exportDOM`은 `kg-card kg-image-card`, `kg-callout-card-blue` 같은 Ghost 테마 class를 출력한다 [검증: 렌더 결과]. Site(Panda)에서 이 class용 CSS를 직접 작성해야 한다(Ghost 테마의 cards CSS에 해당).

### 1.8 이미지 업로드 hook

`fileUploader = { useFileUpload, fileTypes }` [출처: `KoenigComposer.tsx`, `demo/utils/useFileUpload.ts`].
- `useFileUpload(type)`는 React hook이다. 반환값은 `{ progress, isLoading, upload(files, options), errors: {fileName,message}[], filesNumber }`.
- `upload`는 `[{ url, fileName }]`을 resolve한다. `fileName`으로 gallery 등의 미리보기와 매칭한다.
- `fileTypes`: `image`/`video`/`audio`/`mediaThumbnail`/`file` 별 `mimeTypes`, `extensions`.
- R2 + Images binding 업로드 API를 이 hook 형태로 감싸면 된다. Hook 규칙상 TanStack Query mutation으로 구현할 수 있다 [미검증].

### 1.9 Koenig의 한국어 IME 관련 알려진 버그

- **[#29220](https://github.com/TryGhost/Ghost/issues/29220) (open, 2026-05, Ghost 6.36.0)**: "Complex Scripts (E.g., Korean Hangul) Don't Work at Start". 빈 문단 맨 앞에서 한글 조합이 안 되고, 마침표 같은 ASCII를 먼저 쳐야 입력된다. 2026-08 조사 댓글은 Koenig 플러그인에는 문제가 없고 원인이 Lexical 0.13.1의 `$handleCompositionStart`라고 분석했다. 상위 Lexical의 이후 수정(예: facebook/lexical#8121, #8574, #8680)을 근거로 들었다. 조사자도 "not a live repro"라고 밝혔다 [출처].
- Lexical 업그레이드 이력: Koenig는 2024-07에 0.14.3으로 올렸다가 바로 **0.13.1로 되돌렸다**(TryGhost/Koenig #1301, blockquote 붙여넣기 문제). 이후 0.42/0.43 업그레이드 PR(#1170, #1827)은 2026-04에 닫혔다(merge 안 됨) [출처]. 업그레이드 계획은 보이지 않는다.
- facebook/lexical에서 한국어 관련 이슈 중 0.13.1 이후 닫힌 것: #5841(iOS 한국어 조합, 2026-05 닫힘), #5877(숫자/특수문자 뒤 자음 소실), #5104(Safari 빈 인용에서 한국어), #7779, #8098, #8119, #8596(Safari Tab + 한국어 프리즈), #8679, #9289 등 [출처: GitHub 검색 closedAt]. 각 이슈가 "수정"으로 닫혔는지 "stale"로 닫혔는지는 하나씩 확인하지 않았다 [미검증]. 어느 쪽이든 **Koenig(0.13.1)에는 이 수정들이 들어가 있지 않다**.

---

## 2. Ghost HTML 렌더러를 Workers에서 실행

패키지 [출처: npm]:
- `@tryghost/kg-default-nodes@2.2.5`: 노드 정의와 각 노드의 `exportDOM`. deps는 `lexical@0.13.1`, luxon, lodash, `@tryghost/kg-markdown-html-renderer`(markdown-it), `kg-clean-basic-html` 등. Ghost README에 "Must stay browser-safe"라고 적혀 있다.
- `@tryghost/kg-lexical-html-renderer@1.5.2`: deps에 **`jsdom@30.0.1`**, `@lexical/headless@0.13.1`.

소스 [검증: `build/esm/LexicalHTMLRenderer.js`]:
- `new LexicalHTMLRenderer({dom, nodes, onError}).render(lexicalStateJSON, {dom, target: 'html'|...})`.
- `dom`이 없을 때만 `await import('jsdom')`을 한다. 주석: "Consumers in browser environments can pass any `{window: {document}}`-shaped object."
- `exportDOM`에 `options.dom`을 넘기는 구조라서 `document`가 반드시 필요하다. **DOM은 필수이고 jsdom은 필수가 아니다.**

실험 [검증] (wrangler 4.152.0 `deploy --dry-run` 번들 → miniflare/workerd, compat date 2026-08-01):

| 구성 | 결과 |
|---|---|
| `nodejs_compat` + jsdom 그대로 | 빌드 성공, **13,758 KiB / gzip 1,817 KiB**. jsdom이 동적 import라 번들에 들어간다 |
| `nodejs_compat` + `[alias] jsdom = stub` + `dom: linkedom` | 빌드 **1,808 KiB / gzip 405 KiB**. workerd에서 image, codeblock, callout, hr, html, button, call-to-action, embed가 모두 정상 HTML로 렌더됨 |
| `nodejs_compat` 없음 | `markdown-it-image-lazy-loading`이 `node:path`, `node:fs`를 정적 import해서 실패할 것으로 예상(esbuild 단계에서 해석 실패 확인). 실제로는 `base_path` 옵션이 있을 때만 쓰인다 |

주의:
- Node ESM에서 바로 import하면 `lexical@0.13.1`이 CJS(`process.env.NODE_ENV` 분기 require)라서 `SyntaxError: ... does not provide an export named 'DecoratorNode'`가 난다 [검증]. 번들러를 거쳐야 한다. `@cloudflare/vitest-pool-workers`에서 그대로 될지는 [미검증].
- linkedom으로 렌더하면 텍스트 bold가 `<STRONG>`처럼 대문자 태그로 나온다 [검증]. Ghost 렌더러가 `tagName`을 쓰기 때문으로 보인다(HTML로는 유효함). jsdom이나 happy-dom과 출력이 다를 수 있으니, 재렌더링 스냅샷을 만들 때 고정해야 한다.
- `export default`가 없고 `import {LexicalHTMLRenderer} from '@tryghost/kg-lexical-html-renderer'`로 써야 한다 [검증].

---

## 3. Lexical 직접 사용 (`lexical`/`@lexical/*` 0.52.0)

- 라이선스 MIT. `@lexical/react@0.52.0`의 peer는 `react >=18.x`, `react-dom >=18.x`이므로 **React 19를 쓸 수 있다** [출처: npm]. 0.52.0 publish는 2026-09-28로 활발하다.
- ESM 전용으로 배포된다("Lexical packages are published as ES modules", `@lexical/headless` README) [출처].
- **DecoratorNode Card** [출처: ctx7 `/facebook/lexical` docs/concepts/nodes.mdx]: `class X extends DecoratorNode<ReactNode>`에서 `getType`/`clone`/`importJSON`/`exportJSON`/`createDOM`/`updateDOM(): false`/`decorate(): ReactNode`를 구현한다. 0.52에는 `$config()` + `createState`/`$getState`/`$setState` 방식도 있다. 서버 HTML은 `exportDOM()`으로 만든다. 블록 Card는 `isInline(): false`로 두어야 한다. 실험에서 이것을 빠뜨리자 `<p><aside>…</aside></p>`로 감싸져 나왔다 [검증].
- 이미지 업로드, Card 메뉴, 툴바, 슬래시 메뉴는 **직접 만들어야 한다**(playground 예제만 있다). Koenig가 대신 해 주던 일이 모두 우리 작업이 된다.
- **Headless HTML 렌더를 Workers에서 실행** [검증]:
  - 공식 패턴은 `withDOM(() => editor.read(() => $generateHtmlFromNodes(editor)))`이다. `@lexical/headless/dom`은 Node 조건에서 happy-dom을 쓰고, `browser` 조건에서는 `globalThis.window`가 없으면 invariant 오류(#318)를 던진다 [출처: `src/dom.ts`, `src/dom.browser.ts`].
  - wrangler 번들은 browser 빌드를 고른다(번들에 `LexicalHeadlessDom.browser.prod.js`가 들어가고 happy-dom은 0건). 그래서 **`withDOM`만 쓰면 workerd에서 `Lexical error #318`이 난다** [검증].
  - `linkedom`의 `parseHTML()`로 `globalThis.window/document`를 잠시 넣고 렌더하면 성공한다(heading, bold, 커스텀 DecoratorNode `exportDOM`). wrangler 번들은 **1,217 KiB / gzip 297 KiB**였다 [검증].
  - JSON과 Markdown 변환에는 DOM이 필요 없다 [출처].
- 한국어 IME 알려진 버그(open) [출처: GitHub 검색]: #6377 Android Firefox CJK composition 깨짐(siheom-ts가 재현하고 fix plugin을 만듦), #4753 특정 폰트에서 조합 중 커서 위치, #8834 마우스 클릭으로 조합을 확정할 때 스크롤 점프. 그 밖의 다수는 §1.9처럼 최근 버전에서 닫혔다.

---

## 4. Tiptap 3 (기준선)

- `@tiptap/core`, `@tiptap/react`, `@tiptap/html`, `@tiptap/static-renderer`는 모두 `3.32.0`(2026-10-13)이고 MIT이다 [출처: npm]. `@tiptap/react`의 peer는 `react ^17 || ^18 || ^19`로 **React 19를 명시적으로 지원**한다.
- 배포: ESM(`dist/index.js`)과 CJS(`dist/index.cjs`)를 함께 낸다 [출처].
- 오픈소스와 유료 구분: `@tiptap/extension-file-handler`, `drag-handle`, `table`, `unique-id`, `details` 등은 오픈소스이고 `@tiptap-pro/extension-ai`, `comments`는 유료다 [출처: ctx7 `/ueberdosis/tiptap-docs` sandpackConfiguration]. 우리 범위에는 Pro가 필요 없다.
- 커스텀 Card: `Node.create({ name, group: 'block', atom, addAttributes, parseHTML, renderHTML, addNodeView() { return ReactNodeViewRenderer(Component) } })`, 컴포넌트는 `NodeViewWrapper`로 감싼다 [출처: ctx7 tiptap-docs node-views/react].
- 이미지 업로드: `FileHandler.configure({ onDrop(editor, files, pos), onPaste(editor, files, htmlContent), allowedMimeTypes })`. 업로드 결과를 직접 `insertContentAt`해야 한다 [출처: ctx7 filehandler.mdx]. 진행률 UI는 직접 만든다.
- 스타일: headless라 CSS가 없다. Panda와 충돌할 것이 없지만, Card UI와 메뉴를 모두 직접 만들어야 한다.
- **서버 HTML 렌더** [검증]: `renderToHTMLString({extensions, content})`(`@tiptap/static-renderer/pm/html-string`)는 DOM 없이, `nodejs_compat` 없이 workerd에서 동작한다. StarterKit + 커스텀 Node 번들이 **838 KiB / gzip 192 KiB**였다. `@tiptap/html`의 `generateHTML`은 서버에서 happy-dom(peer)을 쓰므로 Workers에서는 static-renderer가 맞다.
- 한국어 IME 알려진 버그(open) [출처: GitHub 검색]: **#4108 조합 중 Enter를 누르면 마지막 음절이 사라짐(CJK, 2023~)**, #6825 Safari에서 리스트 첫 항목 IME, #6838 floating menu가 한국어 입력에 반응하지 않음, #4606 Android에서 빈 줄 첫 글자에 compositionend가 발생함, #5250 협업 커서와 한국어(협업 기능은 우리 범위 밖). siheom-ts에 #4108/#6825용 TipTap Logger와 Windows golden이 있다.

---

## 5. `@siheom/ime` / `@siheom/react` (https://github.com/twinstae/siheom-ts)

버전 [출처: npm]: `@siheom/ime@0.3.1`, `@siheom/react@0.4.0`, `@siheom/core@0.4.0`, `@siheom/ime-cdp@0.3.1`(모두 2026-10-15). 모두 MIT. `@siheom/ime`는 문서에서 **"실험적"**이라고 밝힌다.

### 5.1 무엇을 시뮬레이션하는가 [출처: `apps/docs/guides/ime.md`, `packages/ime/plan.md`, 소스]

- OS에서 캡처한 **golden trace**를 바탕으로 한글 조합 이벤트 시퀀스를 합성 dispatch한다. 이벤트는 `keydown`(`key: "Process"`, `keyCode: 229`, `isComposing`), `compositionstart/update/end`, `beforeinput`/`input`(`insertCompositionText`, Safari용 `insertReplacementText`, `deleteCompositionText`, `insertFromComposition`), `keyup`이다.
- 음절 단위 preedit 진행(`planHangulKeystrokes`, es-hangul 사용), 음절 경계 처리(`김|태` 받침 넘김), Backspace, ArrowLeft, Enter 확정 순서, maxLength 거부 경로, 한자 변환(`@siheom/ime/hanja`)을 다룬다.
- 프로필은 OS/브라우저/IME별 facet이다. 기본은 `linux-chrome-ibus-hangul`이고 그 밖에 `macos-safari(-apple)`, `macos-chrome-apple`, `windows-chrome-ms/ngs`, `windows-firefox-ms`, `android-chrome`, `chromium-enter-229`, `chromium-cdp`와 contenteditable/Slate 전용 프로필이 있다. `SIHEOM_IME_PROFILE` 환경 변수로도 고를 수 있다.
- Chromium의 `InputEvent` 생성자가 버리는 WebKit inputType은 `defineProperty`로 복원한다. 또 Lexical 등이 읽는 `getTargetRanges()`를 contenteditable 끝 위치 range로 채워 준다(`_internal/events.ts`, 주석 "Lexical and other editors read getTargetRanges()").
- input/textarea에서는 이벤트와 함께 `element.value`와 selection을 직접 바꾼다(합성 이벤트는 브라우저가 텍스트를 넣어 주지 않기 때문).

### 5.2 contenteditable 에디터(Lexical, ProseMirror)에서 쓰는 방법과 한계

- **기본 경로의 한계**: `createImeActions`의 `typeImeText`는 프로필의 `hangulComposeMode`에 contenteditable player가 있을 때만 contenteditable을 조합으로 처리한다. 그렇지 않으면 `isEditable(element)`(input/textarea)가 아니므로 **`user.type(element, text)`로 폴백**한다 [검증: `src/createImeActions/createImeActions.ts`]. 문서에도 "`contenteditable`은 현재 `user-event` type으로 폴백합니다. input/textarea 조합이 주 대상입니다."라고 적혀 있다 [출처]. 따라서 **기본/Chrome/Safari/Windows 프로필로 Lexical/Tiptap에 한글을 넣으면 composition 이벤트가 전혀 나오지 않는다.**
- contenteditable player가 있는 프로필: `android-firefox-contenteditable-broken`, `linux-firefox-contenteditable-fixed`, `android-firefox-contenteditable-fixed`, 그리고 `*-slate-*`(Linux/Android Chrome/Firefox, Slate placeholder 시나리오) [검증: `src/profiles/profiles.ts`]. 모두 Firefox 계열이거나 Slate 전용이다.
- **Lexical 사례**(siheom-ts `apps/react-example/test/stories/ime-bugs/lexical/`) [출처]: Lexical #6377(Android Firefox) 재현과 fix plugin(`LexicalAndroidFirefoxCompositionFixPlugin`)을 `linux-firefox-contenteditable-fixed` 프로필로 테스트한다. 이때 **Lexical의 `IS_FIREFOX`를 맞추려고 Vitest에서 UA shim(`lexicalAndroidFirefoxEnv`)을 넣는다**. `readLexicalPlainText(editor)`로 에디터 상태를 검증한다. 즉 Chrome 경로의 Lexical 한글 조합을 흉내 내는 player는 없다.
- **TipTap 사례**(`ime-bugs/tiptap/`) [출처]: Windows golden capture와 프로필은 있지만 plan에 "TipTap broken 게이트 (에디터 문서 상태)", "#4108/#6825 fixed workaround"가 **미완료**로 남아 있다.
- **대안 `@siheom/ime-cdp`** [출처: `packages/ime-cdp/plan.md`, `composeHangulCdp.ts`]: Vitest browser mode(Chromium)에서 CDP `Input.imeSetComposition` + `Input.insertText`로 **실제 브라우저 엔진 조합**을 일으킨다. 브라우저가 DOM을 직접 바꾸므로 contenteditable에도 원리상 맞다. 그러나 현재 `composeHangulCdp(element: HTMLInputElement | HTMLTextAreaElement, …)` 시그니처는 `element.value`를 prefix로 읽는다. contenteditable에서 쓰려면 감싸는 코드가 필요하다 [미검증]. Lexical/Tiptap에 적용한 예는 저장소에 없다.
- 그 밖의 한계: synthetic 이벤트라서 브라우저 네이티브 selection/DOM mutation과 100% 같지 않다. 에디터가 UA로 분기(Lexical `IS_FIREFOX`/`IS_SAFARI` 등)하면 프로필과 UA를 맞춰야 한다. `settle`(`microtask`/`macrotask`) 선택이 재현 여부를 좌우한다.

### 5.3 `@siheom/react` API 요약 [검증: `dist/esm/index.d.ts`]

- `runSiheom(...steps)`: 기본 runner. step은 `given.render(<C/>)`, `actions.*`, `assertions.*`, `effect.*`.
- `createReactSiheom({ user? })` → `{ runSiheom }`. Vitest browser mode에서는 `vitest/browser`의 `userEvent`를 넘겨 trusted input을 쓴다(Ark UI/zag의 interact-outside 감지에 필요하다고 주석에 적혀 있음).
- re-export: `actions`(click, dblclick, hover, fill, type, tab, upload, dragAndDrop), `assertions`(visible, checked, expanded, selected, disabled, focused, current, count, value, href, errormessage, description, textContent, textContents, names, a11ySnapshot, tableSnapshot), `query`, `given`, `effect`(elapsed, runAllTimers), `withFakeTimers`.
- `defaultGivens`, `reactEffects`, `reactFakeTimerScope`, `cleanupReactRoots`. IME를 쓰려면 `@siheom/core`의 `overrideSiheom(base, { actions: createImeActions({profile}) })`로 `fill`/`type`을 바꿔 끼운다.
- peer: `react ^18 || ^19`, `vitest ^4.1.10`, `@testing-library/react ^16`, `@testing-library/dom ^10`, `@testing-library/user-event ^14`, `@testing-library/jest-dom ^6 || ^7`.

---

## 6. map.md와 ADR-0002에 대한 시사점

- **ADR-0002(에디터 JSON 원본 + 저장할 때 HTML 사전 렌더)**: 세 후보 모두 API Worker 안에서 HTML을 렌더할 수 있다. ADR과 충돌하지 않는다. 다만 Koenig와 Lexical은 **DOM 구현(linkedom)이 필요**하고 Koenig는 `nodejs_compat`까지 필요하다. 재렌더링 스크립트도 같은 DOM 구현을 써야 출력이 같아진다.
- **map.md "에디터: Koenig 또는 Lexical을 우선 검토"**: Koenig의 Lexical 0.13.1 고정과 한국어 시작 입력 버그(#29220, open)는 "한국어만 지원"이라는 확정 사항과 정면으로 부딪힌다. Koenig를 고르면 이 버그를 우리가 직접 고치거나 Koenig를 fork해서 Lexical을 올려야 한다. Ghost 자체도 0.14로 올렸다가 되돌린 이력이 있다.
- **map.md "에디터 한국어 입력은 `@siheom/ime`로 테스트"**: 0.3.1 기준으로 contenteditable + Chrome 계열 조합은 흉내 내지 않는다(`user-event` 폴백). 에디터 IME 테스트 전략은 prototype 티켓에서 다시 정해야 한다. 선택지는 (a) `@siheom/ime-cdp`를 contenteditable용으로 감싸기, (b) Firefox contenteditable 프로필 + UA shim, (c) siheom-ts에 Chrome contenteditable player를 추가하는 것이다.

---

## 7. 비교표

| 항목 | Koenig (`@tryghost/koenig-lexical` 1.13.0) | Lexical 직접 (0.52.0) | Tiptap (3.32.0) |
|---|---|---|---|
| 라이선스 | MIT | MIT | MIT (core·FileHandler 등). AI/Comments만 Pro |
| Ghost 밖 독립 사용 | 가능(standalone demo, npm "for external consumers") | 해당 없음 | 해당 없음 |
| 내부 Lexical 버전 | **0.13.1 고정**(2024-01, 번들 내장) | 0.52.0 | ProseMirror 기반 |
| React 19 | peer 선언 없음, React 18.3.1로 빌드. 정적 분석상 장애물 없음 **[미검증]** | `@lexical/react` peer `>=18.x` | peer `^17‖^18‖^19` |
| 번들 | ESM 3.5 MB + UMD 2.9 MB, CSS를 JS에 포함, React external | ESM 전용, 패키지 분할 | ESM + CJS, 패키지 분할 |
| 기본 Card | 30종 이상(우리 7종 모두 있음) | 없음(직접 구현) | 없음(직접 구현) |
| Card 추가/빼기 | `nodes` 배열 + `*Plugin` 조합, `static kgMenu` | DecoratorNode + 직접 만든 메뉴 | `Node.create` + `ReactNodeViewRenderer` |
| 스타일 | Tailwind v3 산출물이 `.koenig-lexical`로 scope됨, layer 밖이라 Panda보다 우선, `.dark` 조상 | 없음(theme class만) → Panda | 없음(headless) → Panda |
| UI 언어 | 영어 하드코딩(i18n 없음) | 직접 작성 | 직접 작성 |
| 이미지 업로드 | `fileUploader.useFileUpload(type)` → `upload(files)` → `[{url,fileName}]` | 직접 구현(DRAG_DROP_PASTE 등) | `FileHandler` `onDrop/onPaste` |
| 서버 HTML 렌더러 | `kg-lexical-html-renderer` + `kg-default-nodes` | `@lexical/headless` + `@lexical/html` `$generateHtmlFromNodes` | `@tiptap/static-renderer` `renderToHTMLString` |
| Workers 실행 | **가능 [검증]**. linkedom을 `dom`으로 전달, `nodejs_compat`, jsdom alias. gzip 405 KiB(alias 없으면 1.8 MiB) | **가능 [검증]**. linkedom을 global로 주입(`withDOM`은 workerd에서 #318). gzip 297 KiB | **가능 [검증]**. DOM, nodejs_compat 모두 불필요. gzip 192 KiB |
| 렌더 출력 마크업 | Ghost `kg-*` class(Site에서 CSS 직접 작성) | 직접 정의(`exportDOM`) | 직접 정의(`renderHTML`) |
| 유지보수 | 활발(Ghost Admin 제품 코드). 단 Lexical 업그레이드는 2024-07 되돌린 뒤 정체 | 활발(0.52, 2026-09) | 활발(3.32, 2026-10) |
| 한국어 IME 알려진 버그 | **#29220 빈 문단 맨 앞 한글 입력 불가(open)**. 0.13.1 이후 Lexical의 IME 수정이 모두 빠져 있음 | open: #6377(Android Firefox), #4753, #8834. 다수 최근 수정 | open: **#4108 조합 중 Enter 시 음절 소실**, #6825, #6838, #4606 |
| `@siheom/ime`로 테스트 | 기본 프로필은 user-event 폴백. Firefox CE 프로필 + UA shim이면 가능(Lexical 0.13.1에서는 [미검증]) | 동일. siheom-ts에 Lexical 예제(Firefox 프로필) 있음 | 동일. siheom-ts에 TipTap Logger/Windows golden 있음, broken gate는 미완료 |

## 출처

- npm 레지스트리 메타데이터: `npm view <pkg>` (2026-10-23 조회), `npm pack`으로 내려받은 tarball: `@tryghost/koenig-lexical@1.13.0`, `@tryghost/kg-default-nodes@2.2.5`, `@tryghost/kg-lexical-html-renderer@1.5.2`, `@lexical/headless@0.52.0`, `@lexical/html@0.52.0`, `@tiptap/*@3.32.0`, `@siheom/ime@0.3.1`, `@siheom/react@0.4.0`, `@siheom/core@0.4.0`, `@siheom/ime-cdp@0.3.1`
- https://github.com/TryGhost/Koenig (archived README)
- https://github.com/TryGhost/Ghost/tree/main/koenig: `README.md`, `koenig-lexical/README.md`, `koenig-lexical/package.json`, `src/components/KoenigComposer.tsx`, `src/components/KoenigEditor.tsx`, `src/plugins/AllDefaultPlugins.tsx`, `src/nodes/DefaultNodes.ts`, `src/nodes/CalloutNode.tsx`, `src/utils/buildCardMenu.ts`, `demo/DemoApp.tsx`, `demo/utils/useFileUpload.ts`, `pnpm-workspace.yaml`
- https://github.com/TryGhost/Ghost/issues/29220, TryGhost/Koenig PR #1299, #1301, #1170, #1827
- https://github.com/facebook/lexical: issues #6377, #4753, #8834, #5841, #5877, #5104, #7779, #8098, #8119, #8596, #8679, #9289. 문서 `docs/concepts/headless.md`, `docs/concepts/nodes.mdx`(ctx7 `/facebook/lexical`)
- https://github.com/ueberdosis/tiptap: issues #4108, #6825, #6838, #4606, #5250. 문서(ctx7 `/ueberdosis/tiptap-docs`): static-renderer, filehandler, node-views/react, sandpackConfiguration
- https://github.com/twinstae/siheom-ts: `README.md`, `apps/docs/guides/ime.md`, `packages/ime/plan.md`, `packages/ime/src/**`, `packages/ime-cdp/plan.md`, `packages/ime-cdp/src/composeHangulCdp/composeHangulCdp.ts`, `apps/react-example/test/stories/ime-bugs/{lexical,tiptap}/`
- 실험 환경: wrangler 4.152.0, miniflare(workerd, compat date 2026-08-01), esbuild, linkedom, Node 24.12.0
