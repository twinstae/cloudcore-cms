# Content 슬라이스: Post/Page 초안 CRUD와 목록

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 11, 23, 24

## 작업

Post와 Page를 만들고, 목록에서 열고, 메타데이터를 고쳐 초안으로 저장하는 길을 끝까지 연다. Body는 이 티켓에서 다루지 않는다(18, 20).

- `packages/schema`에 `ContentSchema`(id, type, status, title, slug, excerpt, featured, publishedAt, authorId, createdAt, updatedAt)와 입력 스키마를 둔다. `PostId`/`PageId`는 branded type.
- D1 테이블 `cc_content`. slug는 Post와 Page를 통틀어 유일하고 `tag`, `page`, `rss`, `sitemap` 같은 예약어를 막는다(11의 결정을 따른다).
- API: `POST /api/content`, `GET /api/content?type=`, `GET /api/content/:id`, `PATCH /api/content/:id`. 모두 `authMiddleware` 뒤에 둔다.
  - Author는 자신의 Post만 목록·상세·수정할 수 있고, Page는 Owner만 만든다. 남의 글 id는 404.
  - 제목이 비면 400. 제목을 처음 넣을 때 slug를 만들고, 사용자가 고친 뒤에는 제목이 바뀌어도 덮어쓰지 않는다.
  - slug 충돌은 409와 함께 그 slug를 쓰는 글의 제목을 돌려준다.
- Admin: Posts/Pages 목록(제목, Status 배지, 마지막 수정 시각, 최근 수정 순)과 편집 화면. 편집 화면은 제목·slug·excerpt·SEO 필드·대표 이미지 자리·featured를 `SimpleForm`으로 다룬다.
- siheom 테스트: 목록 렌더, 새 글 작성→저장→다시 열기, slug 자동 생성 후 수동 수정 유지, Author에게 남의 글이 안 보임.
- API 테스트: 401, Author의 남의 글 404, Page 생성 403, slug 충돌 409.

## 완료 조건

- PRD QC: UC-C01, UC-C02, UC-C03(슬러그·메타 부분), UC-C09와 EC-C01, EC-C05가 통과한다.
- 저장한 글이 새로고침 뒤에도 목록과 편집 화면에 남는다.
- `bun run check` 통과.

## 열린 질문

- Post와 Page의 slug를 한 테이블에서 유일하게 둘지 11에서 확정한다.

## 참고

- 삭제·복원·영구 삭제는 36에서 따로 만든다(확정: 휴지통을 거친다).
- slug는 발행 전에만 바꿀 수 있다. 이 티켓은 초안이라 입력이 열려 있고, 잠금은 26에서 붙인다.
- PRD: [01-content.md](../../../docs/prd/01-content.md)
- 데이터 모델: `.scratch/cms-rewrite/issues/11-grilling-data-model.md`
- `hc` 타입 공유: `apps/api/src/client.ts`, Admin 쿼리는 `queryOptions`로
