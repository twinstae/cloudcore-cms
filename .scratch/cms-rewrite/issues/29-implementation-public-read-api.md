# 공개 읽기 API: 발행된 Content만, Site Build가 쓰는 계약

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 26

## 작업

Site Build가 HTTPS로 호출하는 읽기 전용 API를 만든다. 인증은 없고, 발행된 것만 보여 준다.

- 엔드포인트(모두 GET, `/api/public`):
  - `posts?page=&perPage=` — `published`만, `publishedAt` 내림차순, 페이지 정보와 함께
  - `posts/:slug` — html/plaintext, Tag, 대표 이미지, SEO 필드 포함
  - `pages/:slug`
  - `tags` — Tag 목록과 각 글 수, `tags/:slug/posts`
  - `settings` — 사이트 제목·설명·로고·아이콘·대표 색·OG 이미지·메뉴·소셜 링크·timezone
  - `sitemap` — 발행 글·Page·Tag의 URL과 마지막 수정 시각
- 응답 스키마는 `packages/schema`에 두고 Admin과 Site가 같은 타입을 쓴다. Temporal은 밀리초 3자리 ISO 문자열로 내보낸다.
- `Cache-Control: public, max-age=60` 정도를 두고, 초안·예약 글이 어떤 경로로도 새지 않는 테스트를 넣는다.
- hono-openapi 스펙에 포함하고 Scalar에서 확인할 수 있게 한다.
- API 테스트: 초안 제외, 예약 글은 시각 전까지 제외, 없는 slug 404, 페이지네이션 경계, Author 소유 글도 발행되면 포함.

## 완료 조건

- PRD QC: UC-S04, UC-S05(데이터 부분), UC-S06, UC-S07(데이터 부분)이 통과한다.
- 발행되지 않은 글의 slug로 요청하면 404이고, 응답 어디에도 그 내용이 없다.
- `bun run check` 통과.

## 열린 질문

- 페이지당 글 수(PRD 05의 열린 질문)와 페이지네이션 응답 모양.
- 빌드 중 요청이 몰릴 때 D1 읽기 한도를 넘지 않는지 — Site Build가 페이지마다 호출하지 않도록 전체 목록을 한 번에 받는 형태가 나은지.

## 참고

- PRD: [05-site-and-publishing.md](../../../docs/prd/05-site-and-publishing.md)
- API 규약: `.scratch/cms-rewrite/issues/12-grilling-api-surface.md`, 06 조사
