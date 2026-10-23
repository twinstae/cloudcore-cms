# 모노레포 구조, 패키지 경계, 개발 흐름은 어떻게 할 것인가

Label: wayfinder:grilling
Type: grilling
Status: open
Blocked by: 03, 04, 06, 17

## Question

- 패키지 목록과 경계: 예를 들어 `apps/api`, `apps/admin`, `apps/site`, `packages/schema`(valibot, branded type, Temporal parse), `packages/panda-preset`, UI 패키지가 필요한지. 패키지 사이의 의존 방향.
- `apps/admin` 빌드 결과물을 `apps/api` Worker가 Workers Static Assets로 서빙하는 방식과 SPA fallback
- wrangler 설정(바인딩 이름, 환경 분리 dev/preview/production, secrets), `.dev.vars`
- 로컬 개발 명령(한 번에 전체 스택을 띄우는 방법), e2e 실행 방법
- 루트 scripts, lefthook pre-push 구성, tsrs와 `tsc` 대체 범위, oxlint/oxfmt 설정 위치
- `legacy/`로 옮기는 범위와 제외 설정(ADR-0001)
- AGENTS.md를 새 구조에 맞게 다시 쓸 범위
