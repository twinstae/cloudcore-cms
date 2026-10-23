# 걸어 다니는 뼈대: 모노레포, 세 앱, 품질 게이트

Label: wayfinder:implementation
Type: implementation
Status: claimed
Blocked by:

## 작업

기능 없이 끝에서 끝까지 연결된 뼈대를 만든다. 이후 모든 슬라이스가 여기에 붙는다.

- 기존 코드를 `legacy/`로 옮긴다(ADR-0001).
- bun workspace: `apps/api`, `apps/admin`, `apps/site`.
- `apps/api`: Hono `/api/health`, Admin `dist`를 assets로 서빙(SPA fallback), `@cloudflare/vitest-plugin` 테스트.
- `apps/admin`: Vite + React 19 + TanStack Router(파일 기반) + TanStack Query + Panda(다크모드 condition). `hc` 타입으로 health 호출. 컴포넌트는 `queryOptions`를 props로 받고 siheom browser 테스트로 검사.
- `apps/site`: Astro 정적 빌드, index와 404, assets 전용 `wrangler.jsonc`.
- 루트: oxlint, oxfmt, tsrs `-b --runExternalCode`, lefthook pre-push, `bun run check`.
- **배포**: Workers Builds에 api/site 두 Worker 연결(사람 작업, 아래 체크리스트).

## 완료 조건

- [x] `bun run check` 통과(codegen, lint, format, typecheck, test)
- [x] `wrangler dev`에서 `/api/health` JSON, 임의 경로는 Admin index.html, `/api/없는것` 404
- [x] `apps/site` 정적 빌드
- [ ] Workers Builds 자동 배포로 `*.workers.dev`에서 같은 동작 확인

## 배포 체크리스트 (사람)

1. `bunx wrangler login`
2. Cloudflare 대시보드 → Workers → Create → Import a repository → 이 레포. Worker 2개를 만든다.

| | cloudcore-api | cloudcore-site |
|---|---|---|
| Root directory | `apps/api` | `apps/site` |
| Build variables | `SKIP_DEPENDENCY_INSTALL=1`, `BUN_VERSION=1.4.3` | 같음 |
| Build command | `bun install --frozen-lockfile && bun run build` | `bun install --frozen-lockfile && bun run build` |
| Deploy command | `bunx wrangler deploy` | `bunx wrangler deploy` |

3. 첫 배포 후 `https://cloudcore-api.<계정>.workers.dev/api/health`와 Admin 화면, site index를 확인한다.
