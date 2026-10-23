# 휴지통 슬라이스: 삭제, 복원, 영구 삭제(Revision·Media 포함)

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 25, 27, 28

## 작업

글을 지워도 바로 잃지 않고, 휴지통에서 복원하거나 완전히 지우는 길을 끝까지 연다.

- `cc_content`에 `deleted_at`을 둔다. Status는 바꾸지 않으므로 복원하면 삭제 전 상태로 돌아간다. 휴지통의 slug도 사용 중으로 본다(EC-C07).
- API:
  - `DELETE /api/content/:id` — 휴지통으로 보낸다. Author는 자기 Post만.
  - `POST /api/content/:id/restore` — 복원한다.
  - `GET /api/content?trash=1` — 휴지통 목록.
  - `DELETE /api/content/:id/permanent` — 영구 삭제. Owner만. `[확인 필요]` Author에게도 허용할지.
- 영구 삭제는 한 트랜잭션에서 그 글의 Revision을 지우고, 그 글만 참조하는 Media를 지운다(R2 객체 포함). 다른 글도 참조하는 Media는 남긴다(EC-C08).
- 휴지통으로 보내거나 복원하면 Site Build를 요청한다(32의 훅 모듈을 쓴다).
- Admin: 목록의 휴지통 필터, 복원 버튼, 영구 삭제 확인 다이얼로그("되돌릴 수 없습니다").
- 테스트: 삭제→Site에서 빠짐, 복원→삭제 전 Status, 휴지통 slug 재사용 불가, 영구 삭제가 Revision과 전용 Media를 지움, 공유 Media는 남음, Author의 남의 글 404.

## 완료 조건

- PRD QC: UC-C07, UC-C08와 EC-C07, EC-C08, EC-C09가 통과한다.
- 영구 삭제 뒤 D1과 R2에 그 글의 흔적이 남지 않는다(공유 Media 제외).
- `bun run check` 통과.

## 열린 질문

- 휴지통 보관 기간과 자동 비우기.
- 복원한 글을 삭제 전 Status로 둘지 항상 `draft`로 둘지.
- 공유 Media를 남기는 동작이 번거로운지(Media 화면에서 따로 지워야 한다).

## 참고

- PRD: [01-content.md](../../../docs/prd/01-content.md) UC-C07, UC-C08
- Revision: 27, Media: 28, Site Build: 32
