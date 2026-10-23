# Map: Cloudcore 재설계 (Ghost-lite on Cloudflare)

Label: wayfinder:map

## Destination

새 모노레포(`apps/api`, `apps/admin`, `apps/site`, `packages/*`)로 다시 만든 Cloudcore가 **구현을 마치고 Cloudflare 무료 플랜에 배포되어 동작하는 상태**. 구체적으로는 아래 모두가 끝난 상태다.
- Notes에 적힌 스택과 기능이 구현되어 있다.
- lefthook pre-push(lint, format, typecheck, unit/component/API 테스트)와 최소 e2e가 통과한다.
- Workers Builds로 자동 배포된다.
- `legacy/`가 삭제되어 있다.

**이 맵은 실행까지 포함한다.** 결정 티켓(research, prototype, grilling)으로 길을 밝히고, 결정이 끝난 영역부터 **구현 티켓**을 이 맵의 child로 만들어 진행한다. 구현 티켓은 `Type: implementation`이고, 하나의 vertical slice를 끝까지(테스트 포함) 완성한다. 마지막 구현 티켓이 닫히면 맵이 끝난다.

## Notes

**도메인**: Owner 1명과 초대받은 Author가 쓰는 Ghost 스타일 self-hosted 출판 도구. 용어는 `GLOSSARY.md`를 따른다(Post/Page/Content, Body, Card, Status, Tag, Revision, Media, Site Settings, Owner/Author/Invitation, Admin/Site/API). "block"이라는 말은 쓰지 않는다. 결정 근거는 `docs/adr/` 0001–0005를 본다.

**모든 세션에서 쓸 skill**: grilling과 domain-modeling(용어가 정해지면 바로 `GLOSSARY.md`에 반영), prototype 티켓에서는 prototype skill, research 티켓에서는 research skill을 쓴다.

**참고 자료**
- `../modern-react-starter` (https://github.com/twinstae/modern-react-starter): Panda/Ark, `SimpleForm`/`SimpleField`, stories, fakes, setupTest, oxlint/oxfmt, tsr 설정
- https://github.com/twinstae/siheom-ts: `@siheom/react`, `@siheom/ime`
- https://github.com/disjukr/bunja
- https://hono.dev/examples/hono-openapi, https://hono.dev/examples/scalar
- git `e5772d8`, `legacy/`: 기존 구현(보안 헤더, rate limit 등 재사용할 패턴)

**확정된 스택 (빠뜨리지 말 것)**
- **플랜: Workers Free 플랜 필수(ADR-0005).** 요청당 CPU 10ms와 하루 10만 요청 안에서 동작하도록 설계한다. 유료 플랜은 선택지가 아니다.
- 런타임/배포: `apps/api`는 Hono Worker이고 Admin SPA 정적 자산도 서빙한다. `apps/site`는 **Astro 정적 빌드(SSG)**이고 Workers Static Assets로만 서빙한다(ADR-0004). 발행, 수정, 발행 취소, 예약 발행 시점에 API가 **Site Build**를 트리거하고, 빌드할 때 공개 읽기 API를 HTTPS로 호출한다(service binding이나 SSR 캐시는 쓰지 않음). 배포는 Cloudflare GitHub 연동(Workers Builds) 자동 배포. **GitHub Actions는 쓰지 않는다.**
- 도메인: Cloudflare Registrar에서 도메인 1개를 구입한다. 예: `example.com`=Site, `admin.example.com`=API+Admin, `media.example.com`=R2 공개 버킷.
- 패키지 매니저: **bun** workspace (Workers Builds에서 안 되면 pnpm)
- API: **Hono** + **hono-openapi** + **Scalar** 문서 UI. Admin과 Site는 Hono RPC(`hc`) 타입을 쓴다. 단, 인증 호출은 `better-auth/client`로 한다. 클라이언트도 응답을 parse 스키마로 parse한다.
- DB와 스토리지: Drizzle + D1, R2, Cloudflare Images binding(업로드할 때 webp 변환, 데스크톱/모바일 2개 크기)
- 인증: **Better Auth** (이메일+비밀번호, passkey, 초대 링크 가입, 공개 가입 없음)
- 스키마: **valibot**(zod 대신). 공유 패키지에 두고 branded type(`PostId` 등)을 쓴다. **parse, don't validate**: 모든 경계(HTTP, DB row, env, 폼)에서 parse해서 타입이 있는 값으로 만든 뒤 내부로 넘긴다.
- 시간: **temporal-polyfill**. DB에는 ISO 8601 UTC로 저장하되 **밀리초 3자리로 고정**하고(나노초 기본 출력을 그대로 쓰면 문자열 정렬이 깨진다), 경계에서 `Temporal.Instant`로 바꾸고, 화면에 보여줄 때만 Site Settings의 timezone을 적용한다.
- ID: ULID와 branded type
- Admin: React + **TanStack Router**(파일 기반, tsr) SPA. 서버 캐시는 **TanStack Query**, 폼은 **react-hook-form**(`SimpleForm`/`SimpleField`처럼 value/onChange 없는 컴포넌트), 그 밖의 클라이언트 상태는 **jotai**(앱 전역의 작은 UI 상태)와 **bunja**(생명주기와 스코프가 있는 상태, 예: 에디터 세션, 자동 저장 큐, 다이얼로그 세션). 라우터 상태는 URL로 다룬다. `useState`로 폼 상태를 들고 있지 않는다.
- 컴포넌트 설계: 기능 컴포넌트는 데이터 의존성을 props(`queryOptions`, `onSubmit` 등)로 받고 API 클라이언트를 알지 못한다. 라우트(페이지)는 의존성을 주입하고 합성만 한다. 상태는 컴포넌트마다 격리해서 따로 테스트할 수 있어야 한다.
- 스타일: **Panda CSS + Ark UI**(Tailwind 대신). Panda preset은 Admin과 Site가 공유한다. **다크모드**를 처음부터 넣는다(기본은 시스템 설정, 수동 토글, semantic token).
- 에디터: **Tiptap 3**으로 직접 만든다(08 결정). Ghost 같은 WYSIWYG(+ 메뉴, 슬래시 메뉴, 툴바)를 직접 구현한다. Card 7종: image, code, embed, callout, divider, html, CTA 버튼. Card는 React 없는 spec(`renderHTML`)과 node view를 분리해 API Worker가 spec만 쓴다.
- 테스트: unit / component / API / e2e
  - component: **Storybook story를 컴포넌트마다** 만들고 Vitest browser mode에서 **`@siheom/react`**로 테스트한다. 에디터 한국어 입력은 **`@siheom/ime-cdp`**로 CDP 조합을 contenteditable에 보내고 DOM과 에디터 상태를 함께 검사한다(08).
  - API: `@cloudflare/vitest-plugin`(`vitest-pool-workers`는 deprecated). **Vitest는 모노레포 전체에서 4.1.x로 고정**
  - e2e: 모킹 없이 전체 스택을 띄워 연결만 확인하는 수준으로 최소화한다. 대부분의 기능은 e2e 없이 검증할 수 있어야 한다.
- 품질 도구: 타입체크는 **tsrs**(안 되는 부분만 `tsc` TS7로 대신), 린트는 **oxlint**, 포맷은 **oxfmt**. **lefthook pre-push**에서 lint, format check, typecheck, unit/component/API 테스트를 모두 통과해야 한다. e2e는 수동으로 실행한다.
- 언어: 한국어만 지원한다. i18n은 하지 않는다.

**확정된 제품 결정**: Status는 draft/scheduled/published이고 예약 발행은 Cron으로 처리한다. Author는 Post만 쓴다(Page는 Owner만). Tag는 Author도 붙이거나 만들 수 있고, 수정과 삭제는 Owner만 한다. Media는 누구나 업로드하고, 삭제는 업로더와 Owner가 한다. Author는 다른 사람의 Post를 볼 수 없다. Revision은 발행, 직접 저장, 일정 간격의 자동 저장 때만 만든다. Post 메타데이터는 slug, excerpt, 대표 이미지, SEO(meta title/description, OG 이미지), featured, 수정 가능한 발행일이고 작성자는 1명이다. Site URL은 Ghost와 같다(`/{slug}/`, `/tag/{slug}/`, `/page/N/`, `/rss/`, `/sitemap.xml`). Site는 정적 파일이라 캐시 설계가 필요 없고, 발행은 Site Build가 끝난 뒤 반영된다(ADR-0004, SSR + SWR 결정을 대체함). Invitation과 비밀번호 재설정은 Owner가 링크를 복사해서 전달한다(메일 발송 없음). 이 내용은 grilling 세션(2026-10-23)에서 정했고, 각 티켓에서 다시 논의하지 않는다.

## Decisions so far

<!-- 닫힌 티켓 하나당 한 줄 -->

- [Better Auth를 Workers + D1에서 쓸 수 있는가](issues/01-research-better-auth-on-workers-d1.md): 공식 지원됨. 초대 전용 가입은 직접 만든다(admin plugin `createUser`). 재설정 링크는 내장 verification 토큰으로 처리한다. Admin 인증은 `better-auth/client`를 쓴다. ⚠ 기본 scrypt가 약 70ms라 무료 플랜 CPU 10ms를 넘는다(플랜 결정 대기)
- [이미지 변환, R2 서빙, SSR 캐시 동작](issues/02-research-cloudflare-media-and-caching.md): 업로드 2개 크기 = 변환 2건이므로 월 약 2,500장. SVG는 변환 불가. R2 커스텀 도메인은 zone CDN 캐시를 탄다. Worker 응답 캐시는 Workers Cache로만 된다(요청 과금 주의)
- [Astro SSR과 API Worker 연결](issues/04-research-astro-on-workers.md): (ADR-0004로 SSR, service binding, Workers Cache 부분은 폐기됨) Astro 7 + `@astrojs/cloudflare` 14는 Workers 전용. Panda v2, `<script is:inline>`으로 다크모드. `/rss/`는 확장자 없는 라우트로, sitemap은 직접 만든다. `session: false`, `imageService: 'passthrough'` 필요
- [bun, tsrs, oxlint/oxfmt, lefthook, Storybook 호환성](issues/03-research-toolchain-compat.md): bun + Workers Builds 가능(Worker별 root dir). tsrs는 `.astro`까지 처리(`--runExternalCode` + content mapper), `astro check`는 쓰지 않는다. oxfmt는 `.astro`를 포맷한다. Vitest는 4.1.x로 고정. story는 UI/문서용, 테스트는 `*.test.tsx`에서 story args를 가져와 siheom으로 한다
- [hono-openapi, valibot, Scalar, Hono RPC 조합](issues/06-research-hono-openapi-valibot.md): 함께 동작한다. brand와 transform이 스펙에서 빠지므로 wire/parse 스키마를 짝으로 둔다. Temporal은 밀리초 3자리로 고정한다. API 테스트는 `@cloudflare/vitest-plugin`
- [에디터 후보(Koenig, Lexical, Tiptap)와 @siheom/ime](issues/05-research-editor-candidates.md): 세 후보 모두 Workers에서 HTML 렌더가 가능하다(ADR-0002 유지). ⚠ Koenig는 Lexical 0.13.1 고정 + 한글 입력 버그(Ghost #29220). Tiptap static-renderer가 가장 단순하다. `@siheom/ime`는 Chrome contenteditable 조합을 아직 지원하지 않는다
- [Site Build 트리거와 정적 Astro 배포](issues/17-research-site-build-trigger.md): Workers Builds **Deploy Hook**(Free 가능, 인증 없이 URL이 secret)을 POST한다. 대기 중인 빌드는 플랫폼이 합쳐 주므로 debounce가 거의 필요 없다. 정적 Astro는 어댑터 없이 `assets`만 쓴다(정적 요청은 무료, 무제한). ⚠ 계정 전체 동시 빌드 1개, 빌드 20분 상한
- [참고 레포에서 가져올 컨벤션](issues/07-research-reference-conventions.md): SimpleForm/SimpleField(valibot Standard Schema resolver), Ark+Panda slot recipe 래퍼, mock 금지 규칙과 fakes alias, siheom 작성 규칙, bunja+jotai 패턴 초안. ⚠ `@siheom/ime`가 기본 프로필에서는 contenteditable 조합을 에뮬레이션하지 않음(`@siheom/ime-cdp` 확인 필요)
- [어떤 에디터를 쓸 것인가](issues/08-prototype-editor-choice.md): **Tiptap 3**로 간다. 서버 렌더는 DOM 없이 되고(gzip 197 KiB, nodejs_compat 불필요), Card 마크업을 우리가 소유하며, Koenig의 Lexical 0.13.1 고정과 Ghost 마크업/영어 UI를 안고 가지 않는다. Card는 spec(renderHTML)+node view 분리. Body는 Tiptap JSON을 valibot으로 경계에서 parse. 한글 IME 테스트는 `@siheom/ime-cdp`를 contenteditable로 감싼다(CDP는 keydown 229 순서를 재현하지 않아 IME 버그 판정에는 부족). 구현 티켓 18–20 생성. ⚠ Tiptap #4108(조합 중 Enter) 회귀 테스트를 셸 티켓에서 먼저

## Not yet specified

- **예약 발행 실행 세부**: Cron 주기, 실패하면 재시도할지, `scheduled`에서 `published`로 바뀔 때 Revision을 어떻게 처리할지. 기본 흐름(Cron에서 `UPDATE ... RETURNING` 후 Deploy Hook 1회 호출)은 17 조사에서 정해졌다.
- **자동 저장과 Revision 간격**: N분을 몇으로 할지, 동시에 두 탭에서 편집할 때 충돌을 어떻게 처리할지.
- **embed Card의 oEmbed 처리**: 서버에서 가져올지 클라이언트에서 가져올지, 어떤 provider를 허용할지, html Card의 sanitize 정책.
- **Owner 최초 설정(bootstrap) 흐름**, 그리고 legacy의 보안 헤더와 rate limit 패턴 중 무엇을 가져올지.
- **Media 참조 무결성**: Body나 대표 이미지가 참조하는 Media를 삭제할 때 어떻게 할지.
- **일괄 재렌더링 스크립트**: ADR-0002의 결과로 필요해짐. 실행 방식(Worker 엔드포인트 또는 wrangler 스크립트).
- **e2e 시나리오 목록**: 무엇을 연결 확인 대상으로 삼을지.
- **JSON export(백업)**: 필요한지, 형식은 어떻게 할지.
- **인프라 프로비저닝 순서**: 도메인 구입, D1/R2/Images 생성, Workers Builds 연결. 구현 티켓 단계에서 HITL 체크리스트로 만들 예정.

## Out of scope

- 멤버, 뉴스레터, 유료 구독
- Site 검색, 댓글, 다중 작성자 Post, 분석
- 다크모드 외의 테마 커스터마이징, 여러 테마 교체, code injection
- i18n(한국어만 지원)
- 메일 발송(Invitation과 비밀번호 재설정은 링크로 전달)
- 기존 데이터 import와 블록 데이터 마이그레이션(운영 데이터 없음)
- 전달 시점 이미지 변환(ADR-0003)
- 다단계 역할(Editor, Contributor), 검토 요청 워크플로우, OAuth, 매직링크, CF Access, 감사 로그
- GitHub Actions CI
