# 발행 슬라이스: 즉시 발행, 발행 취소, 예약 발행(Cron)

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 25

## 작업

Status를 `draft`/`scheduled`/`published` 세 가지로 움직이는 길을 끝까지 연다. Site Build 요청은 32에서 붙인다.

- API: `POST /api/content/:id/publish`, `POST /api/content/:id/unpublish`, `POST /api/content/:id/schedule`(시각 전달), `POST /api/content/:id/unschedule`.
  - 발행은 제목과 Body가 있어야 한다. Body가 비면 400(EC-C06).
  - 발행하면 `publishedAt`을 기록하고, 이미 발행된 글을 고쳐 다시 발행하면 `publishedAt`을 유지한다. 발행일 수정 입력을 받는다.
  - 발행 취소는 `draft`로 돌리고 `publishedAt`은 남겨 둔다(수정 가능).
  - 예약은 미래 시각만 받고 `scheduledAt`을 저장한다. 예약 취소는 `draft`.
  - Author는 자기 Post만, Page는 Owner만.
  - 발행하면 slug 입력을 잠근다. 이후 바꾸려 하면 409로 거부하고 이유를 알린다(EC-C02). 예약은 아직 발행 전이므로 잠그지 않는다.
- Cron Trigger(주기는 32에서 정한 값을 재사용, 처음엔 5분): 지난 `scheduledAt`을 가진 글을 한 번의 `UPDATE ... RETURNING`으로 `published`로 바꾸고 `publishedAt`을 채운다. 같은 글이 두 번 처리되지 않아야 한다.
- Admin: 편집 화면의 발행 패널(지금 발행/예약/발행 취소), 목록의 Status 배지와 예약 시각. 실패 시 이유를 보여 준다.
- 테스트: 발행→취소→재발행, 예약 시각 전후 Cron 실행, 두 번 실행해도 결과가 같음, Author의 남의 글 404, 빈 Body 발행 400.

## 완료 조건

- PRD QC: UC-C04, UC-C05와 EC-C02, EC-C03, EC-C06이 통과한다.
- 예약 시각이 지난 뒤 Cron을 돌리면 상태와 `publishedAt`이 한 번만 바뀐다.
- `bun run check` 통과.

## 열린 질문

- Cron 주기와 지연 상한(예: 5분 주기면 최대 5분 늦게 발행).
- 예약 글을 편집할 때 `scheduled`를 유지할지 `draft`로 되돌릴지.

## 참고

- PRD: [01-content.md](../../../docs/prd/01-content.md) UC-C04, UC-C05
- 발행 시 Site Build: 32, [05-site-and-publishing.md](../../../docs/prd/05-site-and-publishing.md) UC-S08
