# Site 뼈대와 Site Settings: 빌드 시 읽기 API 소비, 레이아웃, 다크모드, 설정 화면

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 13, 29

## 작업

Site가 공개 읽기 API에서 값을 받아 레이아웃을 그리고, 그 값을 Admin에서 고치는 길을 끝까지 연다.

- `apps/site`: 빌드 시(Bun 스크립트 또는 Astro의 빌드 훅) `settings`와 `tags`를 한 번 가져와 빌드 전체가 같은 값을 쓰게 한다. API 주소는 환경 변수로 받는다.
- 레이아웃: 사이트 제목·설명·로고, 내비게이션 메뉴, 푸터의 소셜 링크. Panda preset을 Admin과 공유하고, semantic token으로 라이트/다크를 정의한다.
- 다크모드: `<script is:inline>`으로 첫 페인트 전에 테마를 정하고, 헤더에 토글을 둔다(04 조사).
- 잠정 테마는 13에서 고른 안을 따른다. `[확인 필요]` 13이 닫히지 않았으면 최소 타이포그래피 레이아웃으로 시작하고 13에서 교체한다.
- API: `GET /api/settings`(공개), `PATCH /api/settings`(Owner만), 내비게이션·소셜 링크 배열을 함께 저장. timezone은 IANA 이름만 허용.
- Admin: Site Settings 화면. 제목·설명·로고·아이콘·대표 색·OG 이미지·timezone, 메뉴 항목 추가/순서 변경/삭제(연결 대상은 Page 또는 URL), 소셜 링크. 로고·아이콘은 Media에서 고른다.
- siheom 테스트: 메뉴 순서 변경, Page 연결, 소셜 링크 추가/삭제, timezone 선택, Author는 화면에 들어갈 수 없음.

## 완료 조건

- PRD QC: UC-S01, UC-S02, UC-S03, UC-S10이 통과한다. (S10은 빌드된 Site에서 확인)
- Site Settings를 저장하고 다시 빌드하면 Site 머리글과 푸터에 반영된다.
- 다크 모드로 새로고침해도 깜빡이지 않는다.
- `bun run check` 통과.

## 열린 질문

- 메뉴가 가리키는 Page가 발행 취소되면 항목을 빼는지(PRD 05 UC-S02의 `[가정]`).
- 로고·아이콘 크기 권장값과 업로드 시 자동 리사이즈 여부.

## 참고

- PRD: [05-site-and-publishing.md](../../../docs/prd/05-site-and-publishing.md)
- 조사: `.scratch/cms-rewrite/issues/04-research-astro-on-workers.md`, 13(테마)
