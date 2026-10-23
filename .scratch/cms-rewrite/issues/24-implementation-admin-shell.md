# Admin 셸: 레이아웃, 권한별 내비게이션, 다크모드

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 14, 23

## 작업

로그인한 뒤 어느 화면으로 가든 같은 뼈대를 쓴다. 기능 화면은 이 셸의 outlet에 붙는다.

- TanStack Router의 pathless layout route에 사이드바(또는 상단 내비)를 둔다. 항목은 Posts, Pages, Media, Tags, Site Settings다.
- 세션 role에 따라 항목을 숨긴다. Author에게는 Posts, Media, Tags만 보인다([04-members.md](../../../docs/prd/04-members.md) UC-A04, EC-A06). 라우트 접근도 같은 기준으로 막고, 직접 URL로 들어가면 403 화면 대신 목록으로 보낸다.
- 현재 위치 표시, 로딩·에러 상태를 공통 컴포넌트로 처리한다. 에러는 재시도 버튼을 제공한다.
- 다크모드 토글(시스템/라이트/다크)을 셸에 두고 선택을 저장한다. Panda semantic token만 쓴다.
- Storybook story: 셸(Owner), 셸(Author), 에러 상태.
- siheom 테스트: role별로 보이는 메뉴가 다르다, 토글이 테마를 바꾼다.

## 완료 조건

- Owner와 Author로 로그인했을 때 내비게이션 항목이 다르게 보인다.
- Author가 `/settings`로 직접 이동하면 화면이 깨지지 않고 Posts로 돌아간다.
- 다크모드 선택이 새로고침 뒤에도 유지되고, 첫 페인트에 깜빡임이 없다.
- `bun run check` 통과.

## 참고

- 컨벤션: `docs/agents/conventions.md`, ADR-0001
- 화면 흐름: `.scratch/cms-rewrite/issues/14-grilling-admin-screens-and-flows.md`
- PRD: [04-members.md](../../../docs/prd/04-members.md) UC-A04, EC-A06, [01-content.md](../../../docs/prd/01-content.md) UC-C01
