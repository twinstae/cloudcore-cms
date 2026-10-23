# Media 슬라이스: 업로드, Images 변환, R2 서빙, 삭제 권한

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 02, 23, 24

## 작업

이미지를 올리고, 두 크기로 변환해 R2에 두고, Admin에서 관리하는 길을 끝까지 연다. 19의 image Card가 기대하는 `upload(file) => {src, mediaId, width, height}` 계약을 이 티켓이 실제로 채운다.

- D1 테이블 `cc_media`(id, key, 원본 파일명, mime, width, height, 데스크톱·모바일 변형 키, alt, 업로더 id, createdAt).
- API: `POST /api/media`(multipart), `GET /api/media`, `DELETE /api/media/:id`.
  - Cloudflare Images binding으로 webp 두 크기를 만들고 R2의 `media.example.com` 버킷에 쓴다(ADR-0003). 원본은 남기지 않는다. `[확인 필요]` SVG는 변환이 안 되므로 거부하고 이유를 알린다.
  - 업로드는 로그인 사용자, 삭제는 업로더와 Owner만. 파일 크기·MIME 상한을 정해 400으로 막는다.
- Admin: Media 화면(그리드, 업로드 드래그, alt 편집, 삭제 확인), 업로드 진행률과 실패 메시지. `useMutation` + `queryClient.invalidateQueries`.
- API 테스트는 R2·Images를 fake 바인딩으로 바꿔 검증하고, `wrangler dev`에서 실제 업로드 한 번을 확인한다.
- siheom 테스트: 업로드하면 그리드에 나타난다, Author가 남의 파일 삭제를 누르면 버튼이 없다/403, 실패 시 메시지.

## 완료 조건

- PRD QC: UC-M01부터 UC-M06까지와 EC-M01, EC-M03, EC-M04가 통과한다.
- 로그인한 사용자가 이미지를 올리면 R2 URL로 Admin에서 보인다.
- 업로더가 아닌 Author의 삭제 요청은 403, Owner는 성공한다.
- 19의 image Card에서 같은 `upload` 계약으로 본문 삽입이 된다.
- `bun run check` 통과.

## 열린 질문

- Body나 대표 이미지가 참조하는 Media를 지울 때 막을지, 경고만 할지(map의 "Media 참조 무결성").
- 월 2,500장 변환 한도(02) 안에서 실패했을 때 원본을 그대로 올릴지.

## 참고

- PRD: [03-media.md](../../../docs/prd/03-media.md)
- 조사: `.scratch/cms-rewrite/issues/02-research-cloudflare-media-and-caching.md`
- ADR-0003(R2 커스텀 도메인, 전달 시점 변환 없음)
