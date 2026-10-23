# Site 콘텐츠 페이지: 글, Page, 태그, 페이지네이션, RSS, sitemap

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 18, 30

## 작업

독자가 실제로 읽는 페이지를 만든다. 모두 빌드 시점에 생성되는 정적 파일이다.

- `/{slug}/` 글 페이지: 제목, 발행일(Site Settings timezone 적용), 대표 이미지, 저장된 `html` 그대로 출력, Tag 링크, 이전/다음 글.
- `/{slug}/` Page: 같은 slug 공간을 공유하므로 Post와 Page 중 존재하는 것을 그린다.
- `/tag/{slug}/`: 그 Tag의 발행 글 목록. `/page/N/`: 첫 화면의 페이지네이션. 첫 화면은 최근 글 목록.
- `/rss/`: 발행 글의 제목·링크·요약·발행 시각. `/sitemap.xml`: 글·Page·Tag URL.
- `<head>`: title, description, canonical, OG/Twitter 카드(대표 이미지 또는 기본 OG). SEO 필드가 비면 제목과 excerpt를 쓴다.
- 빈 상태: 글이 없으면 첫 화면에 사이트 소개만 보여 준다(EC-S04).
- 테스트: 빌드 결과 HTML을 검사한다 — 초안 slug 파일이 없다, 태그 목록에 발행 글만 있다, rss/sitemap 항목 수와 순서, head 메타, timezone 표시.
- `bun run build`가 읽기 API 주소 없이도 로컬 fake 데이터로 실패하지 않게 한다(개발용 fake는 `apps/site` 안에 둔다).

## 완료 조건

- PRD QC: UC-S04, UC-S05, UC-S06, UC-S07과 EC-S04, EC-S06이 통과한다.
- 발행 글 3개·초안 1개로 빌드하면 사이트에 초안 흔적이 전혀 없다.
- `bun run check` 통과.

## 열린 질문

- RSS 요약에 html 일부를 넣을지 plaintext를 넣을지.
- `/page/1/`을 둘지(`/`만 둘지).

## 참고

- PRD: [05-site-and-publishing.md](../../../docs/prd/05-site-and-publishing.md)
- Body html: 18, Card 마크업: 19
