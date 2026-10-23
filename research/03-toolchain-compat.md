# 툴체인 호환성 조사: bun, tsrs, oxlint/oxfmt, lefthook, Storybook을 한 모노레포에서

티켓: `.scratch/cms-rewrite/issues/03-research-toolchain-compat.md`
조사일: 2026-10-23
범위: 맵 Notes의 "확정된 스택" 가운데 패키지 매니저, 배포, 타입체크, 린트/포맷, git hook, 컴포넌트 테스트 도구가 함께 동작하는지 확인한다.

표기 규칙
- **[실험]**: 스크래치패드에서 직접 설치하고 실행해서 확인한 내용. 환경은 Linux x86_64, glibc 2.39, bun 1.4.3, Node 24.12.0이다.
- **[문서]**: 1차 출처(공식 문서, 소스, npm 메타데이터, 공식 이슈)에서 확인한 내용.
- **[미검증]**: 출처나 실험으로 확인하지 못한 추론.

## 요약

| 항목 | 판정 | 핵심 |
| --- | --- | --- |
| bun workspace + Workers Builds | 동작 가능 (일부 미검증) | 빌드 이미지 기본 Bun이 1.4.3이고 `bun.lock`을 지원한다. 자동 설치가 모노레포 루트의 lockfile을 찾는지는 문서에 없다. 그래서 `SKIP_DEPENDENCY_INSTALL=1`을 켜고 install을 build command에 직접 적는다. pnpm으로 바꿀 이유는 찾지 못했다. |
| tsrs | 사용 가능 (0.x, 주의 필요) | 0.18.0(TS 7.1-dev 기반)이 bun 설치와 `-b` project references, `.astro`(content mapper), Panda `styled-system`, `routeTree.gen.ts`를 모두 처리한다. 진단도 `tsc` 7과 같았다. |
| `.astro` 타입체크 | `tsrs`(또는 TS 7.1 `tsc`) + `@astrojs/ts-content-mapper` | `astro check`(`@astrojs/check`)는 TypeScript 7을 지원하지 않는다(peer `^5 \|\| ^6`). TS 7.0.2의 `tsc`도 content mapper를 모른다. |
| oxlint | `.astro`는 `<script>`와 frontmatter만 lint | React/a11y/import 플러그인을 켜야 한다. starter 설정은 `plugins`를 덮어써서 react 규칙이 꺼져 있다. |
| oxfmt | `.astro` 포맷 가능 | `"astro": true`와 `@astrojs/compiler-rs` 설치가 필요하다(Prettier 기반이라 Node가 필요하다). |
| lefthook | 문제없음 | bun이 기본으로 postinstall을 신뢰한다. pre-push는 루트 명령 몇 개로 충분하다. |
| Storybook 10 + Vitest browser | 동작 가능, 버전 고정 필요 | **`@cloudflare/vitest-pool-workers`는 `@cloudflare/vitest-plugin`으로 이름이 바뀌었다(맵과 다름).** Vitest 5 지원은 아직 열린 버그가 있다. 모노레포 전체에서 Vitest를 4.1.x로 맞추는 것을 권장한다. |

---

## 1. bun workspace 모노레포를 Workers Builds로 배포

### 1.1 확인된 사실

- **[문서]** Workers Builds 빌드 이미지는 2026-10-14에 기본 Bun을 1.2.15에서 **1.4.3**으로 올렸다. "Bun 1.4.3 supports both v1 (`bun.lockb`) and v2 (`bun.lock`) lockfiles". 버전은 `BUN_VERSION` 빌드 변수로 고정한다. Node 기본값은 24.21.0이다(`NODE_VERSION`, `.nvmrc`, `.node-version`).
  - https://developers.cloudflare.com/changelog/ (2026-10-14 "Workers Builds now uses newer versions of Node.js, Python, Go, Bun, and more"). 소스: `cloudflare/cloudflare-docs` `src/content/changelog/workers/2026-10-14-workers-builds-default-tooling.mdx`
  - 참고로 https://developers.cloudflare.com/workers/ci-cd/builds/build-image/ 표는 아직 Bun 1.2.15, Node 24.18.0으로 적혀 있다(문서 갱신이 늦음).
- **[문서]** 빌드 환경은 Ubuntu 24.04 x86_64이다. `SKIP_DEPENDENCY_INSTALL=1|true`로 자동 의존성 설치를 끄고 직접 설치 명령을 실행할 수 있다. (build-image 문서)
- **[문서]** 모노레포 설정 방법(https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/#monorepos):
  1. 레포 안의 Worker마다 대시보드에서 같은 Git 레포를 연결한다.
  2. Worker마다 **root directory**를 그 Worker의 `wrangler.jsonc` 위치로 지정한다. 빌드 명령과 배포 명령이 이 디렉터리에서 실행된다.
  3. Worker마다 build command와 deploy command를 따로 둘 수 있다.
  4. **build watch paths**로 어떤 경로가 바뀔 때 빌드할지 정한다. 포함/제외 패턴을 쓰고, 와일드카드는 앞이나 끝에만 둘 수 있다(https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/).
- **[문서]** 대시보드의 Worker 이름은 root directory에 있는 Wrangler 설정의 `name`과 같아야 한다(https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/).
- **[문서]** deploy command 기본값은 `npx wrangler deploy`이고 원하는 패키지 매니저로 바꿀 수 있다. Workers Builds는 `package.json`에 적힌 Wrangler 버전을 쓴다(https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).
- **[문서]** build cache를 켜면 bun 전역 캐시(`.bun/install/cache`)와 Astro의 `node_modules/.astro`를 캐시한다(https://developers.cloudflare.com/workers/ci-cd/builds/build-caching/).
- **[문서]** 모노레포 자동 설치 동작: pnpm 모노레포에서 root directory를 하위 폴더로 지정해도 자동 설치가 `pnpm install --frozen-lockfile`을 **워크스페이스 전체**에 실행했다는 보고가 있다(cloudflare/workers-sdk#10941, 2025-10, closed). 메인테이너는 pnpm이 원래 그렇게 동작한다고 답했다. 해결책으로 `SKIP_DEPENDENCY_INSTALL=true`를 켜고 build command를 `pnpm install --filter=<pkg>... --frozen-lockfile && pnpm run build`로 바꾼 사례가 공유됐다. 이 사례는 자동 설치가 하위 root directory에서도 레포 루트 lockfile의 패키지 매니저(pnpm)를 감지했다는 것을 보여준다.
  - https://github.com/cloudflare/workers-sdk/issues/10941
- **[미검증]** bun의 경우 lockfile이 레포 루트에 있고 root directory가 `apps/api`일 때 자동 설치가 `bun install`을 고르는지 직접 확인한 1차 출처는 찾지 못했다. 문서에는 lockfile 감지 규칙이 없다.

### 1.2 실험 결과

- **[실험]** bun 1.4.3 workspace(`apps/*`, `packages/*`)의 **하위 폴더(`apps/site`)에서 `bun install --frozen-lockfile`**을 실행하면 bun이 워크스페이스 루트를 찾아 전체를 설치한다(루트 `node_modules`와 다른 앱의 `node_modules`가 모두 생긴다).
- **[실험]** `bun install --frozen-lockfile --filter @exp/site`를 실행하면 그 워크스페이스의 의존성만 설치한다. 루트 devDependencies(oxlint, tsrs 등)와 다른 앱은 설치하지 않는다.
- **[실험]** bun 1.4.3의 workspace 기본 linker는 isolated다. 패키지가 `node_modules/.bun/` 아래에 있고 각 워크스페이스 `node_modules`에는 링크만 있다. 앱마다 다른 버전의 같은 패키지(예: `typescript`)를 둘 수 있다.

### 1.3 권장 구성

Worker 2개(`apps/api`, `apps/site`)마다 대시보드에서 다음과 같이 설정한다. 확인되지 않은 자동 설치에 기대지 않는다.

| 설정 | `apps/api` Worker | `apps/site` Worker |
| --- | --- | --- |
| Root directory | `apps/api` | `apps/site` |
| Build variables | `SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION=1.4.3` | 같음 |
| Build command | `bun install --frozen-lockfile --filter @cloudcore/api && bun run build` | `bun install --frozen-lockfile --filter @cloudcore/site && bun run build` |
| Deploy command | `bunx wrangler deploy` | `bunx wrangler deploy` |
| Build watch paths (include) | `apps/api/*`, `apps/admin/*`, `packages/*`, `bun.lock` | `apps/site/*`, `packages/*`, `bun.lock` |

- `apps/api` 빌드에는 Admin SPA 정적 자산 빌드가 포함된다. 그래서 api의 filter에는 `apps/admin`도 들어가야 한다. 예: `--filter @cloudcore/api --filter @cloudcore/admin`. **[미검증]** `--filter`가 워크스페이스 의존성(`workspace:*`)을 따라 설치하는지는 이번 실험에서 따로 확인하지 않았다. 실험의 `@exp/site`는 `@exp/shared`에 의존했고 정상적으로 링크됐지만, shared에는 외부 의존성이 없었다. 구현 단계에서 확인해야 한다.
- `bun.lock`은 레포 루트에 하나만 둔다.
- `--filter`를 빼면 전체 워크스페이스를 설치한다. 빌드 시간만 늘고 동작은 한다. 처음에는 단순하게 `bun install --frozen-lockfile`로 시작해도 된다.
- **pnpm 대안**: pnpm도 같은 구성으로 동작한다(workers-sdk#10941의 해결책). bun이 실패할 근거가 없으므로 맵 결정(bun)을 유지한다.
- **[미검증]** Site의 service binding 대상인 api Worker가 먼저 배포되어 있어야 site 첫 배포가 성공할 가능성이 높다. 인프라 프로비저닝 체크리스트에서 api를 먼저 배포한다.

---

## 2. tsrs

### 2.1 현황 ([문서])

- 저장소: https://github.com/oxc-project/tsrs (Apache-2.0, 약 2.0k stars, main 커밋 약 1,957개). "drop-in replacement for the TypeScript 7 compiler and language server, written in Rust"이고, 목표는 100% conformance, 더 적은 메모리, 더 빠른 타입체크다.
- npm 최신 릴리스: `tsrs@0.18.0-ts7.1.0-dev.20260929` (2026-10-19). TypeScript `7.1.0-dev.20260930` 커밋 `b85298b6a81f`를 포팅했다. 버전 문자열이 포팅한 TS 버전을 나타낸다.
- 다음 후보: `0.19.0-ts7.1.0-beta` (TS `v7.1-beta` 커밋 `3e9236361fa9`, 아직 미배포). `docs/STATUS.md`
- 적합성(STATUS.md, 0.19 후보 기준): error baseline 13,700개와 `.types`/`.symbols` baseline 12,998개를 모두 통과하고, `.js` emit baseline 13,626개를 통과한다.
- 설치와 실행(`docs/USAGE.md`): `pnpm add -D tsrs`, `tsrs -p <project> --noEmit`. `tsc` 플래그를 그대로 쓴다. `--watch`, `-b --watch`는 Linux/macOS만 지원한다. 언어 서버는 `tsrs --lsp -stdio`.
- 미지원(`docs/COMPATIBILITY.md`): `--init`, `--showConfig`, `--generateTrace`, `--locale`(영어만). TS7에서 제거된 옵션(`baseUrl`, ES5 target, AMD/UMD/System)은 tsgo와 같은 TS5102/TS5108 오류를 낸다.
- **project references / `--build`**: 지원한다. `tsbuild` scenario baseline 192개 중 189개를 통과한다. 실패한 것은 `--help`, `--init` 같은 포팅하지 않은 CLI다.
- **content mapper** (`.vue`, `.svelte`, `.astro`): **CLI와 `-b`에서 지원**한다. **언어 서버에서는 아직 미지원**이다. tsconfig의 `contentMappers` 항목이 지정한 외부 프로세스를 `--runExternalCode` 플래그가 있을 때 실행하고, JSON-RPC로 가상 TS를 받아 타입체크한다. 진단 위치는 원본 `.astro` 위치로 되돌려 보고한다(`notes/contentmappers.md`). 이 기능은 TypeScript 7.1에 들어간 업스트림 기능(microsoft/TypeScript#63936)을 포팅한 것이다.
- 지원 플랫폼: macOS arm64, Linux x64/arm64 (glibc, musl). Intel macOS와 Windows x64는 0.18.0까지 패키지가 없다(다음 릴리스에 설정됨). 이 레포의 개발 환경(Linux x64)과 Workers Builds(Ubuntu x86_64)는 지원 대상이다.
- 기여: 이슈는 받지만 "Pull requests remain closed". 외부 PR로 고칠 수 없다.

### 2.2 Astro 쪽 상황 ([문서])

- `@astrojs/ts-content-mapper@0.2.0` (2026-09-17 생성): "A TypeScript content mapper for `.astro` files. It lets TypeScript 7.1+ (`tsc`) parse and type-check Astro components directly". 설정은 아래와 같다.
  ```json
  {
    "contentMappers": [
      { "package": "@astrojs/ts-content-mapper", "extensions": [".astro"] }
    ]
  }
  ```
  실행은 `tsc --noEmit --runExternalCode`. 패키지 매니페스트가 `exec: ["node", "dist/server.js"]`이므로 **PATH에 `node`가 있어야 한다**.
- `@astrojs/check@0.9.12` peer는 `typescript: ^5.0.0 || ^6.0.0`이다. TypeScript 7 환경에서 실패하는 이슈가 있다: withastro/astro#17268 ("astro/check thinks typescript is not installed when using TypeScript 7"), #17336 ("`astro check` fails with TypeScript 7"). 둘 다 closed지만 peer 범위는 여전히 TS7을 포함하지 않는다.
- 알려진 문제 withastro/astro#18471 (open, 2026-10-21): content mapper를 쓰면 `node_modules/astro/components/*.astro`가 **프로젝트 옵션으로 함께 검사**된다. `.astro`는 `.d.ts`가 아니어서 `skipLibCheck`이 적용되지 않는다. `astro/tsconfigs/strictest`(`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)에서는 고칠 수 없는 오류 9개가 난다. `strict` preset에서는 오류가 없다. 이슈 작성자는 tsrs 0.18.0도 같은 9개를 보고한다고 적었다.

### 2.3 실험 결과 ([실험])

스크래치패드에 bun workspace(`packages/shared`, `apps/admin`, `apps/site`)를 만들어 실행했다.

1. **bun 설치**: `bun add -d tsrs@0.18.0-ts7.1.0-dev.20260929`가 정상 동작했다. 네이티브 바이너리(optional dependency `@tsrs/linux-x64-gnu`)가 isolated linker 아래에서도 잡혔다. `bunx tsrs --version` 출력: `Version 7.1.0-dev.20260930.4 (tsrs 0.18.0-ts7.1.0-dev.20260929, microsoft/TypeScript@b85298b6a81f)`.
2. **project references**: 루트 `tsconfig.json`이 `{"files": [], "references": [...]}`이고 `packages/shared`가 `composite: true`일 때, `bunx tsrs -b`가 의존 순서대로 빌드했다. 일부러 넣은 branded type 오류(`const bad: PostId = "x"`)를 잡았다.
3. **`.astro`**: `apps/site`(astro 7.4.2, `extends: "astro/tsconfigs/strict"`, 위 `contentMappers`)에서 결과는 다음과 같았다.
   - `--runExternalCode` 없이 실행하면 `error TS18068: Content mappers require the '--runExternalCode' command line flag to be enabled.`
   - `--runExternalCode`와 함께 실행하면 frontmatter의 오류를 원래 위치로 보고했다. `src/pages/index.astro(4,7): error TS2322: Type 'string' is not assignable to type 'number'.` 워크스페이스 패키지 `@exp/shared` import도 해석됐다.
   - 루트 references에 `apps/site`를 넣고 `tsrs -b --runExternalCode`를 실행하면 세 프로젝트를 한 번에 검사했다.
   - 비교: `typescript@7.0.2`의 `tsc`는 `error TS5023: Unknown compiler option '--runExternalCode'`를 낸다. `typescript@7.1.0-beta`의 `tsc`는 tsrs와 같은 진단을 냈다.
4. **Panda `styled-system` + TanStack Router `routeTree.gen.ts`**: `panda codegen`(@pandacss/dev 2.4.0)과 `tsr generate`(@tanstack/router-cli)로 생성한 파일을 `include`에 넣고 검사했다. tsrs와 `tsc` 7.0.2가 **같은 진단 3개**를 냈다. branded type 오류, 존재하지 않는 라우트 `<Link to="/nope">`(`'"/nope"' is not assignable to type '"." | ".." | "/posts/$postId"'`), Panda 스타일 속성 오류다. 생성 파일은 평범한 TS/`.d.mts`라서 특별한 처리가 필요 없다.
   - Panda 오류(`'p' does not exist in type 'SystemStyleObject'`)는 실험용 `panda.config.ts`에 preset을 지정하지 않아서 생긴 것으로 보인다. tsrs 문제는 아니다(`tsc`도 같은 오류를 냈다). **[미검증]** starter처럼 `@pandacss/preset-base`/`preset-panda`를 명시하면 사라질 것이다.
5. `-b`는 `*.tsbuildinfo`를 각 프로젝트에 쓴다. `.gitignore`에 넣어야 한다.

### 2.4 권장 구성

- 루트 `tsconfig.json`은 solution 스타일로 두고(`files: []` + `references`) 각 앱과 패키지를 참조한다. 공유 패키지는 `composite: true`로 둔다.
- `apps/site/tsconfig.json`: `extends: "astro/tsconfigs/strict"`(**`strictest` 금지**, #18471)에 `contentMappers`를 추가한다. devDependency로 `@astrojs/ts-content-mapper`를 둔다.
- 타입체크 명령: `tsrs -b --runExternalCode`. 그 전에 코드 생성 단계를 실행한다(아래 4절).
- **대체 경로**: tsrs가 회귀하면 `typescript@7.1.x`의 `tsc -b --runExternalCode`로 그대로 바꿀 수 있다. 설정이 같고 실험에서 진단도 같았다. TS 7.0.x는 `.astro`를 처리하지 못하므로 **7.1 이상**이어야 한다. 7.1은 현재 beta이고 stable은 아직 없다(npm dist-tags: `latest: 7.0.2`, `beta: 7.1.0-beta`).
- `astro check`는 기본 경로에서 뺀다. 꼭 필요하면 `apps/site`에만 `typescript@^6`과 `@astrojs/check`를 둔다(isolated linker라 앱별 버전이 가능하다). **[미검증]** 이렇게 할 이점이 거의 없다.
- 에디터: tsrs LSP는 content mapper를 아직 지원하지 않는다. `.astro` 편집은 Astro VS Code 확장(자체 언어 서버)을 쓴다.
- `tsconfig`에서 `baseUrl`을 쓰지 않는다. TS7과 tsrs 모두 오류를 낸다. starter의 `tsgoconfig.json`(`baseUrl: null`)은 이 때문에 있는 것이다. `paths`는 `baseUrl` 없이 tsconfig 기준 상대경로로 동작한다.

---

## 3. oxlint / oxfmt

### 3.1 `.astro` 지원 ([문서] + [실험])

- **oxlint**: "Framework files (`.vue`, `.svelte`, `.astro`) by linting only their `<script>` blocks" (https://oxc.rs/docs/guide/usage/linter.html). **[실험]** oxlint 1.89.0이 `.astro`의 frontmatter와 `<script>` 안의 `debugger`를 모두 보고했다. 템플릿(HTML 부분)은 lint하지 않는다.
- **oxfmt**: `.astro`는 번들된 Prettier(`prettier-plugin-astro`)로 포맷한다. 기본값은 비활성이다. 설정에 `"astro": true`를 넣고 **`@astrojs/compiler-rs` 패키지를 직접 설치**해야 한다. Prettier 기반 포맷은 Node가 필요하고, npm `oxfmt` 패키지에서만 동작한다(GitHub Releases의 standalone binary는 건너뛴다). 출처: https://oxc.rs/docs/guide/usage/formatter/language-support.html, https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html
  - **[실험]** oxfmt 0.74.0 + `@astrojs/compiler-rs` 0.5.2 + `{"astro": true}`에서 `oxfmt --check`가 `.astro` 파일을 검사했고, `oxfmt`가 frontmatter와 `<script>`를 정리했다. 설정 없이 실행하면 `.astro`만 있는 폴더에서 "Expected at least one target file"이 난다.

### 3.2 규칙 세트 (starter 비교)

`../modern-react-starter/.oxlintrc.json`은 `plugins: ["typescript", "unicorn", "oxc", "vitest"]`, `categories.correctness: "error"`, 그리고 `vitest/no-restricted-vi-methods`(vi.mock, spyOn, fn 등 금지, 한국어 메시지)와 `vitest/expect-expect`(`assertFunctionNames: ["expect", "runSiheom"]`)를 쓴다.

- **[문서]** "Setting `plugins` overwrites the default plugin set". 따라서 starter 설정은 **react, jsx-a11y, import 규칙이 꺼진 상태**다.
- 권장(**[실험]** oxlint 1.89.0에서 이 설정으로 `debugger`와 jsx-a11y `alt` 누락을 잡았다):
  ```json
  {
    "$schema": "./node_modules/oxlint/configuration_schema.json",
    "plugins": ["typescript", "unicorn", "oxc", "react", "jsx-a11y", "import", "vitest"],
    "categories": { "correctness": "error", "suspicious": "warn" },
    "ignorePatterns": ["**/styled-system/**", "**/routeTree.gen.ts", "**/.astro/**", "**/dist/**", "**/node_modules/**"],
    "rules": {
      "react/react-in-jsx-scope": "off",
      "import/no-cycle": "error"
      // + starter의 vitest/no-restricted-vi-methods, vitest/expect-expect 그대로
    }
  }
  ```
- **[실험]** 주의: `.gitignore`가 없거나 git 저장소가 아닌 곳에서는 oxlint가 하위 워크스페이스의 `node_modules`까지 lint했다. 레포에서는 `.gitignore`가 있어 문제없겠지만, `ignorePatterns`에 `**/node_modules/**`를 넣어 두면 안전하다.
- type-aware lint(`--type-aware`, `typescript/*` 규칙)와 `--type-check`(TS 진단 출력)는 `oxlint-tsgolint`(현재 7.0.2005)가 필요하다. 내부적으로 tsgo를 쓰므로 tsrs와 별개이고 `.astro`를 이해하지 못한다. 타입체크는 tsrs로 하고 type-aware lint는 필요할 때만 켠다. 출처: https://oxc.rs/docs/guide/usage/linter/type-aware
- 모노레포에서는 **루트에 설정 하나**를 두고 루트에서 `oxlint`, `oxfmt --check`를 한 번 실행한다. 앱별 규칙이 필요하면 `overrides`나 nested config를 쓴다. `options.typeAware`는 루트 설정에만 둘 수 있다.

---

## 4. lefthook pre-push

- **[실험]** bun 1.4.3에서 `lefthook@2.2.2`의 `postinstall`은 기본 신뢰 목록에 있어서 `bun pm untrusted`에 나오지 않았다(`trustedDependencies` 추가 불필요). 명시적으로 하려면 루트 `"prepare": "lefthook install"`을 둔다.
- **[문서]** `bun run --filter '*' <script>`는 워크스페이스 의존 순서를 지키며 실행한다. `--parallel`/`--sequential`, `--if-present`(`--workspaces`와 함께), `--no-exit-on-error`를 지원한다. 출처: https://github.com/oven-sh/bun/blob/main/docs/pm/filter.mdx
- **[문서]** lefthook은 `parallel: true`, `jobs`, `skip: [merge, rebase]`, `LEFTHOOK=0`(일회 우회)을 지원한다. 출처: https://github.com/evilmartians/lefthook (docs/configuration)

권장 `lefthook.yml` (**[미검증]** git 저장소에서 실제 push로 실행해 보지 않았다):

```yaml
pre-push:
  parallel: false   # codegen이 typecheck보다 먼저 끝나야 한다
  jobs:
    - name: codegen
      run: bun run --filter '*' --if-present codegen   # panda codegen, tsr generate, astro sync
    - name: checks
      group:
        parallel: true
        jobs:
          - name: lint
            run: bunx oxlint
          - name: format
            run: bunx oxfmt --check
          - name: typecheck
            run: bunx tsrs -b --runExternalCode
          - name: test
            run: bun run --filter '*' --if-present test:run
```

- 각 워크스페이스 `test:run`은 `vitest run`이다. **`bun test`를 쓰면 안 된다**(bun 자체 테스트 러너가 `*.test.ts`를 실행한다). 반드시 `bun run test:run` 형태로 Vitest를 호출한다.
- 생성물(`styled-system/`, `.astro/`)은 gitignore하고 hook과 빌드에서 매번 생성한다. `routeTree.gen.ts`는 커밋하거나 생성 대상에 넣는다. starter는 `prepare: "panda codegen --clean"`을 쓰지만, 워크스페이스 패키지의 `prepare`가 `bun install` 때 실행되는지는 **[미검증]**이다. 그래서 명시적인 `codegen` 스크립트를 권장한다.
- Playwright 브라우저(`bunx playwright install chromium`)가 개발 머신에 있어야 component 테스트가 돈다.

---

## 5. Storybook 10 + Vitest browser mode + `@storybook/addon-vitest` (bun)

### 5.1 버전 현황 ([문서], npm 2026-10-23)

| 패키지 | 최신 | 비고 |
| --- | --- | --- |
| `storybook` | 10.6.3 | |
| `@storybook/addon-vitest` | 10.6.3 | peer `vitest ^4.0.0 \|\| ^5.0.0`, `@vitest/browser-playwright ^4 \|\| ^5` |
| `vitest` | 5.0.5 (`latest`), 4.1.12 | 5.0.0은 2026-09-03에 나왔다 |
| `@vitest/browser-playwright` | 5.0.5 | peer `vitest: 5.0.5`(정확히 일치해야 한다) |
| `@cloudflare/vitest-pool-workers` | 0.23.0 | **deprecated**: "has been renamed to @cloudflare/vitest-plugin. This package will not receive future updates." peer `vitest ^4.1.0` |
| `@cloudflare/vitest-plugin` | 1.4.7 | peer `vitest ^4.1.0 \|\| ^5.0.0` |

- **[문서]** 이름 변경: Cloudflare changelog 2026-08-19 "@cloudflare/vitest-pool-workers is now @cloudflare/vitest-plugin". 설정 API는 같고 의존성 이름, import, `types` 항목만 바꾸면 된다. 공식 문서도 `@cloudflare/vitest-plugin`(`cloudflareTest` 플러그인)을 쓴다. 출처: `cloudflare/cloudflare-docs` `src/content/changelog/workers/2026-08-19-vitest-plugin.mdx`, https://developers.cloudflare.com/workers/testing/vitest-integration/
- **[문서]** Vitest 5 지원은 아직 불안정하다. workers-sdk#15618("Support Vitest v5")은 open이고, 메인테이너가 "keep this issue open until we get that fixed"라고 했다(2026-10-09). 관련 open 버그로 #16252(commonjs 의존성을 ESM으로 로드), #16331(setup 파일에서 `cloudflare:test` import 시 workerd 종료), #16238(coverage shim)이 있다. Cloudflare의 agents 문서도 `vitest@^4.1.0`으로 설치하라고 안내한다.
- **[문서]** `@storybook/addon-vitest`는 Vitest 4.0 이상이 필요하다. 설정은 `test.projects` 배열과 `storybookTest({ configDir })` 플러그인, `browser.provider: playwright({})`로 한다. 출처: Storybook `MIGRATION.md`, `code/addons/vitest/templates/vitest.config.4.template.ts`

### 5.2 권장

- **모노레포 전체에서 Vitest를 4.1.x로 고정한다.** 여기에 `@vitest/browser-playwright`와 `@vitest/coverage-v8`도 같은 4.1.x로 맞춘다. starter는 `"vitest": "latest"`라서 지금 설치하면 5.x가 들어온다. `latest`를 쓰지 않는다. `@cloudflare/vitest-plugin`의 Vitest 5 버그가 닫히면 함께 5로 올린다.
  - 대안: isolated linker라서 `apps/admin`은 Vitest 5, `apps/api`는 Vitest 4로 나눌 수 있다. 하지만 루트에서 한 번에 돌리는 `vitest` projects 구성을 못 쓰고 버전 관리가 복잡해진다. 권장하지 않는다.
- 맵의 "API: `@cloudflare/vitest-pool-workers`"는 **`@cloudflare/vitest-plugin`으로 바꾼다.**
- starter 구성에서 알게 된 점: `vite.config.ts`의 `test.projects`에는 `storybookTest` 플러그인이 **없다**(`plugins: []`). story는 Storybook UI와 문서용이다. 테스트는 `*.test.tsx`에서 `import * as Stories from "./X.stories.tsx"`로 story의 `args`를 가져와 `@siheom/react`의 `runSiheom`으로 검사한다. addon-vitest는 설치만 되어 있고 Storybook UI의 테스트 패널용이다. 이 패턴을 그대로 쓰면 story 자체를 테스트로 돌리는 `storybookTest` 프로젝트는 선택 사항이다.
- starter의 브라우저 테스트 설정을 그대로 가져온다: `setupFiles: ["src/setupTest.ts"]`(`IS_REACT_ACT_ENVIRONMENT = true`, `@testing-library/dom`의 `asyncUtilTimeout: 3000`, `afterEach(cleanupReactRoots)`), `vitest.shims.d.ts`의 `/// <reference types="@vitest/browser-playwright" />`, 그리고 `fake-aliases.ts`를 Vitest(`resolve.alias`)와 Storybook(`viteFinal`)에 함께 쓰는 구성이다.
- bun 관련 주의:
  - `bun run storybook`, `bun run test:run`은 각 CLI의 `#!/usr/bin/env node` shebang에 따라 Node로 실행된다. **[미검증]** bun 문서의 shebang 규칙에 근거한 판단이다. `--bun`을 붙여 Bun 런타임으로 강제하지 않는다. Vitest와 Storybook은 Node 기준으로 테스트된다.
  - Storybook framework는 `@storybook/react-vite`를 쓴다. starter는 TanStack Start용 `@storybook/tanstack-react`를 쓰지만 Admin은 Start가 아닌 SPA다. **[미검증]** Admin에 맞는 framework는 구현 티켓에서 확인한다.
  - **[미검증]** isolated linker에서 Storybook이나 Vite가 phantom dependency(직접 선언하지 않은 패키지)를 찾지 못하는 문제가 생기면 `bunfig.toml`에 `[install] linker = "hoisted"`를 둔다. 이번 실험(Astro, Panda, TanStack Router, tsrs)에서는 이런 문제가 없었다.

---

## 6. 맵 결정과 다른 점 또는 보완할 점

1. **`@cloudflare/vitest-pool-workers` → `@cloudflare/vitest-plugin`** (deprecated, 2026-08-19 이름 변경). 맵의 테스트 항목을 고쳐야 한다.
2. **Vitest 버전 고정**: Workers 테스트 도구의 Vitest 5 지원이 아직 불안정하므로 Vitest 4.1.x로 통일한다. starter의 `latest`를 그대로 가져오면 안 된다.
3. **`astro check`는 TS7 환경에서 쓰지 않는다.** `.astro` 타입체크는 tsrs의 content mapper(`@astrojs/ts-content-mapper` + `--runExternalCode`)로 한다. 대체 경로는 `tsc` 7.1(beta)이다. 7.0은 `.astro`를 처리하지 못한다.
4. `astro/tsconfigs/strictest`를 쓰지 않는다(#18471).
5. bun과 tsrs 모두 **맵 결정대로 사용 가능**하다. pnpm으로 바꿀 근거는 없다. 다만 Workers Builds 자동 설치의 bun 감지는 미검증이므로 `SKIP_DEPENDENCY_INSTALL=1`과 명시적 install 명령을 쓴다.

## 7. 출처 목록

- tsrs: https://github.com/oxc-project/tsrs (README, `docs/USAGE.md`, `docs/COMPATIBILITY.md`, `docs/STATUS.md`, `notes/contentmappers.md`), npm `tsrs@0.18.0-ts7.1.0-dev.20260929`
- `@astrojs/ts-content-mapper@0.2.0` npm README. TypeScript content mapper PR: https://github.com/microsoft/TypeScript/pull/63936
- Astro 이슈: https://github.com/withastro/astro/issues/18471, https://github.com/withastro/astro/issues/17268, https://github.com/withastro/astro/issues/17336
- Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/build-image/, https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/, https://developers.cloudflare.com/workers/ci-cd/builds/configuration/, https://developers.cloudflare.com/workers/ci-cd/builds/build-watch-paths/, https://developers.cloudflare.com/workers/ci-cd/builds/build-caching/, https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/, changelog 2026-10-14(빌드 이미지 기본 버전), 2026-08-19(vitest-plugin 이름 변경)
- https://github.com/cloudflare/workers-sdk/issues/10941, https://github.com/cloudflare/workers-sdk/issues/15618
- oxc: https://oxc.rs/docs/guide/usage/linter.html, https://oxc.rs/docs/guide/usage/linter/type-aware, https://oxc.rs/docs/guide/usage/formatter/language-support.html, https://oxc.rs/docs/guide/usage/formatter/config-file-reference.html (ctx7 `/websites/oxc_rs`)
- bun: https://github.com/oven-sh/bun/blob/main/docs/pm/filter.mdx, https://github.com/oven-sh/bun/blob/main/docs/pm/workspaces.mdx (ctx7 `/oven-sh/bun`)
- lefthook: https://github.com/evilmartians/lefthook (ctx7 `/evilmartians/lefthook`)
- Storybook: https://github.com/storybookjs/storybook (`MIGRATION.md`, `code/addons/vitest/templates/vitest.config.4.template.ts`, ctx7 `/storybookjs/storybook`)
- 로컬 참고: `../modern-react-starter` (`.oxlintrc.json`, `.oxfmtrc.json`, `vite.config.ts`, `.storybook/main.ts`, `tsconfig.json`, `tsgoconfig.json`, `src/setupTest.ts`, `src/stories/ExampleForm.test.tsx`)
- 실험 버전: bun 1.4.3, Node 24.12.0, tsrs 0.18.0-ts7.1.0-dev.20260929, typescript 7.0.2 / 7.1.0-beta, astro 7.4.2, @astrojs/ts-content-mapper 0.2.0, oxlint 1.89.0, oxfmt 0.74.0, @astrojs/compiler-rs 0.5.2, lefthook 2.2.2, @pandacss/dev 2.4.0
