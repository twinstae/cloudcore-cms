# 모노레포 구조, 패키지 경계, 개발 흐름은 어떻게 할 것인가

Label: wayfinder:grilling
Type: grilling
Status: resolved
Blocked by: 03, 04, 06, 17

## Question

- 패키지 목록과 경계: 예를 들어 `apps/api`, `apps/admin`, `apps/site`, `packages/schema`(valibot, branded type, Temporal parse), `packages/panda-preset`, UI 패키지가 필요한지. 패키지 사이의 의존 방향.
- `apps/admin` 빌드 결과물을 `apps/api` Worker가 Workers Static Assets로 서빙하는 방식과 SPA fallback
- wrangler 설정(바인딩 이름, 환경 분리 dev/preview/production, secrets), `.dev.vars`
- 로컬 개발 명령(한 번에 전체 스택을 띄우는 방법), e2e 실행 방법
- 루트 scripts, lefthook pre-push 구성, tsrs와 `tsc` 대체 범위, oxlint/oxfmt 설정 위치
- `legacy/`로 옮기는 범위와 제외 설정(ADR-0001)
- AGENTS.md를 새 구조에 맞게 다시 쓸 범위

## Answer

grilling 대신 뼈대를 먼저 만들고 그 결과로 답한다([21](21-implementation-walking-skeleton.md), 브랜치 `feat/walking-skeleton`). 바꾸고 싶은 부분은 코드 리뷰에서 고친다.

- 패키지: `apps/api`(Hono Worker + Admin 정적 자산), `apps/admin`(Vite SPA), `apps/site`(Astro 정적). `packages/*`는 **필요해질 때** 만든다. 지금 공유되는 것은 Hono RPC 타입뿐이고 `@cloudcore/api/client`(`hc` 래퍼)로 export한다. valibot 스키마 패키지는 Tag 슬라이스에서 경계 스키마가 생길 때 만든다.
- Admin 서빙: api `wrangler.jsonc`의 `assets.directory: ../admin/dist`, `not_found_handling: single-page-application`, `run_worker_first: ["/api/*"]`. API는 모두 `/api` 아래. dev에서는 Vite가 `/api`를 8787로 proxy.
- 루트 scripts: `codegen`, `lint`(oxlint), `format`/`format:check`(oxfmt), `typecheck`(`tsrs -b --runExternalCode`, solution tsconfig), `test`(워크스페이스별 `test:run`), `check`(전부). lefthook pre-push가 같은 것을 돈다.
- `legacy/`: 기존 코드를 통째로 옮겼고 lint/format에서 제외, workspace와 tsconfig references에 없다.
- 아직 안 정한 것(필요할 때 정함): 환경 분리(dev/preview/production), secrets, AGENTS.md 재작성, e2e 실행법.
