# Card 7종: 에디터 → 저장 → Site 렌더 수직 슬라이스

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 18

## 작업

Card마다 “에디터에서 넣고 → 저장하고 → Site가 출력한다”를 끝까지 닫는다. 공통 패턴은 spec(`renderHTML`) + node view + valibot 스키마 + 테스트다.

- **image**: atom node + node view(캡션/alt 편집, 삭제). `upload(file) => {src, mediaId, width, height}`를 props로 주입하고 테스트는 fake를 쓴다. 실제 R2+Images 업로드는 미디어 구현 티켓에서 이 계약에 연결한다.
- **cta**: `label`/`href`/`variant`(primary, secondary).
- **callout**: `tone` + inline text.
- **html**: `html` attr. sanitize 정책은 데이터 모델/보안 티켓에서 확정하기 전까지 보수적으로 막는다.
- **embed**: `url`(필요하면 `provider`/`html`). oEmbed fetch는 정책이 정해질 때까지 stub.
- **code**: StarterKit `codeBlock` + `language`. **divider**: StarterKit `horizontalRule`.
- Site와 Admin이 같은 `cc-*` 마크업 CSS를 공유한다(Admin은 편집 UI, Site는 출력).
- 카드마다 `@siheom/react` 상호작용 테스트 1개, html 골든 1개, Storybook story 1개.
- 완료 기준: 7종 각각을 에디터에서 삽입·편집해 저장하고, 저장된 `html`을 Site가 그대로 렌더한다.
