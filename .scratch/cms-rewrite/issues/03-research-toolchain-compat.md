# bun, tsrs, oxlint/oxfmt, lefthook, Storybook 툴체인이 모노레포에서 함께 동작하는가

Label: wayfinder:research
Type: research
Status: resolved
Blocked by:

## Question

다음 툴체인 조합이 실제로 동작하는지와 대안을 확인한다.
- **bun workspace 모노레포를 Cloudflare Workers Builds(GitHub 연동)로 배포**: 앱별 root directory 설정, bun.lock 인식, 빌드 명령, 여러 Worker를 한 레포에서 따로 배포하는 방법. 안 되면 pnpm에서 같은 것이 되는지.
- **tsrs**(https://github.com/oxc-project/tsrs): 현재 성숙도, 설치와 실행 방법, monorepo/project references 지원, `.astro` 파일·Panda가 생성한 `styled-system`·TanStack Router가 생성한 `routeTree.gen.ts`를 처리하는지. 안 되는 부분을 `tsc`(TS7)와 `astro check`로 대신하는 구성.
- **oxlint/oxfmt**: `.astro` 파일 지원 여부와 React/TS 권장 규칙 세트(`../modern-react-starter` 설정 참고)
- **lefthook** pre-push: bun workspace 전체에 lint, format check, typecheck, test를 거는 구성
- **Storybook 10 + Vitest browser mode(Playwright) + `@storybook/addon-vitest`**를 bun 환경에서 쓸 때 주의할 점(`../modern-react-starter` 참고)

결과는 research 문서로 남기고 이 티켓에서 링크한다.

## Answer

- **bun + Workers Builds는 쓸 수 있다.** 빌드 이미지 기본 Bun이 1.4.3이고(2026-10-14 changelog) `bun.lock`을 지원한다. Worker마다 같은 레포를 연결하고 root directory(`apps/api`, `apps/site`)와 build watch paths를 따로 둔다. pnpm으로 바꿀 근거는 없다.
- 자동 설치가 레포 루트의 `bun.lock`을 감지하는지는 문서에 없다(미검증). 그래서 Worker마다 `SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION=1.4.3`을 켠다. Build command는 `bun install --frozen-lockfile --filter <pkg> && bun run build`, Deploy command는 `bunx wrangler deploy`로 둔다. 하위 폴더에서 `bun install`을 실행해도 워크스페이스 루트를 찾아 설치한다는 것은 실험으로 확인했다.
- **tsrs는 쓸 수 있다**(`0.18.0-ts7.1.0-dev.20260929`, 0.x이고 외부 PR을 받지 않는다). 실험에서 bun 설치, `-b` project references, Panda `styled-system`, `routeTree.gen.ts`가 모두 동작했고 진단이 `tsc` 7과 같았다.
- **`.astro`도 tsrs로 타입체크한다.** `@astrojs/ts-content-mapper`를 tsconfig `contentMappers`에 넣고 `tsrs -b --runExternalCode`로 실행한다. 실험에서 frontmatter 오류를 원래 위치로 보고했다. 언어 서버는 아직 content mapper를 지원하지 않고, 매퍼 실행에 `node`가 필요하다.
- `astro check`(`@astrojs/check`)는 peer가 `typescript ^5 || ^6`이라 TS7에서 쓰지 않는다. 대체 경로는 `tsc` **7.1(beta)**이다. 7.0.2는 `--runExternalCode`를 모른다.
- `astro/tsconfigs/strictest`는 쓰지 않는다. Astro 내장 컴포넌트에서 고칠 수 없는 오류가 난다(withastro/astro#18471). `strict`를 쓴다.
- **oxlint**는 `.astro`의 frontmatter와 `<script>`만 lint한다. **oxfmt**는 `"astro": true`와 `@astrojs/compiler-rs`를 설치하면 `.astro`를 포맷한다(실험 확인).
- starter의 `.oxlintrc.json`은 `plugins`를 덮어써서 react, jsx-a11y, import 규칙이 꺼져 있다. 이 세 플러그인을 추가하고 생성물을 `ignorePatterns`에 넣는다. type-aware lint(`oxlint-tsgolint`)는 tsgo 기반이라 tsrs와 별개다.
- **lefthook** pre-push 구성: `codegen`(panda, tsr, astro sync)을 먼저 실행한다. 그다음 `oxlint`, `oxfmt --check`, `tsrs -b --runExternalCode`, `bun run --filter '*' --if-present test:run`을 병렬로 실행한다. `bun test`(bun 자체 러너)는 쓰지 않는다. bun은 lefthook의 postinstall을 기본으로 신뢰한다.
- **맵과 다른 점: `@cloudflare/vitest-pool-workers`는 deprecated다.** 2026-08-19에 `@cloudflare/vitest-plugin`으로 이름이 바뀌었다.
- **Vitest는 모노레포 전체에서 4.1.x로 고정한다.** `@cloudflare/vitest-plugin`의 Vitest 5 지원에 열린 버그가 남아 있다(workers-sdk#15618 등). starter의 `"vitest": "latest"`는 지금 5.x를 설치한다.
- starter 패턴: story는 UI와 문서용이다. 테스트는 `*.test.tsx`에서 story `args`를 가져와 `@siheom/react`의 `runSiheom`으로 검사한다. `storybookTest` 프로젝트는 선택 사항이다.

Context: 브랜치 `research/toolchain-compat`, 파일 `research/03-toolchain-compat.md`
