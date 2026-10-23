# Revision 슬라이스: 저장·발행 시 스냅샷, 목록, 복원

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 18, 25

## 작업

글의 이전 상태를 남기고 되돌리는 길을 끝까지 연다. 자동 저장은 Revision을 만들지 않는다.

- D1 테이블 `cc_revision`(id, contentId, title, slug, excerpt, body JSON, html, plaintext, SEO 필드, 대표 이미지, Status, createdBy, createdAt). 스냅샷 필드는 11의 결정을 따른다.
- Revision은 직접 저장(수동 저장 버튼), 발행, 발행 취소 때 생긴다. 예약 시각에 Cron이 발행할 때도 하나 남긴다. 같은 내용이면 중복 생성하지 않는다. 자동 저장(60초, 브라우저)은 Revision을 만들지 않는다.
- 글을 휴지통에서 영구 삭제하면 그 글의 Revision도 함께 지운다(36).
- API: `GET /api/content/:id/revisions`, `POST /api/content/:id/revisions/:revisionId/restore`.
  - 복원하면 현재 내용을 먼저 Revision으로 남기고, 복원한 내용을 `draft`로 저장한다. `published` 글이면 Site는 다음 빌드까지 이전 내용을 보여 준다.
  - Author는 자기 Post의 Revision만 본다.
- Admin: 편집 화면의 "기록" 패널(시각, 작성자, 되돌리기 버튼과 확인 다이얼로그). 되돌리기 전에 현재 내용을 저장한다는 안내를 보여 준다.
- 테스트: 저장 3회 → Revision 3개, 복원 → 새 Revision + 현재 글이 draft, 같은 내용 저장은 중복 없음, 남의 글 Revision 404.

## 완료 조건

- PRD QC: UC-C06이 통과한다.
- 복원 뒤 목록에서 Status가 `draft`로 보이고, 편집 화면 내용이 복원 시점과 같다.
- `bun run check` 통과.

## 열린 질문

- 저장할 때마다 Revision을 만들면 D1 무료 한도(쓰기)에 얼마나 영향을 주는지. 필요하면 최근 N개만 남긴다.
- "일정 간격의 자동 저장"을 Revision으로 남길지 여부(현재 Glossary는 남기지 않는 쪽).

## 참고

- PRD: [01-content.md](../../../docs/prd/01-content.md) UC-C06
- Body 계약: 18, 자동 저장 큐: 20
