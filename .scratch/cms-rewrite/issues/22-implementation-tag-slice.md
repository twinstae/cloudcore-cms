# Tag 수직 슬라이스: D1 → API → Admin 화면

Label: wayfinder:implementation
Type: implementation
Status: claimed
Blocked by: 21

## 작업

처음으로 데이터를 다루는 기능을 끝까지 만든다. 여기서 생긴 모양이 이후 슬라이스(Post, Media, Settings)의 컨벤션이 된다. 인증은 아직 없다(23에서 라우트에 건다).

- D1 + Drizzle: `cc_tag`(id ULID, name, slug unique, description, created/updated는 밀리초 3자리 ISO). drizzle-kit migration, `wrangler d1 migrations apply --local`.
- `packages/schema`(이 슬라이스에서 생성): valibot `TagId`(brand), wire/parse 스키마 짝(06), Temporal 변환.
- API: `GET/POST /api/tags`, `PATCH/DELETE /api/tags/:id`. hono-openapi + valibot validator, Scalar `/api/docs`. slug 중복은 409.
- Admin: `TagList`(tags를 props로), `TagForm`(SimpleForm/SimpleField + valibot, onSubmit 주입), 라우트 `/tags`가 `tagsQueryOption`으로 데이터를 가져와 합성. 컨벤션은 `docs/agents/conventions.md`. Ark UI Dialog로 생성/수정. 다크모드 토글(jotai).
- Storybook을 이 슬라이스에서 붙인다(story는 fake 주입, 테스트는 story args + siheom).

## 완료 조건

- API 테스트: 생성/목록/수정/삭제, slug 중복 409, 잘못된 입력 400
- component 테스트: 목록 렌더, 폼 검증 메시지, 제출 시 onSubmit 값
- `wrangler dev`에서 Admin `/tags`로 Tag를 만들고 새로고침해도 남아 있다
