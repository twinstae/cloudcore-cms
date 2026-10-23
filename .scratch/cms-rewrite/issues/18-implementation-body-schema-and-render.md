# Body 스키마와 Tiptap 확장·서버 렌더 기반

Label: wayfinder:implementation
Type: implementation
Status: open
Blocked by: 08, 10

## 작업

모노레포 스켈레톤 위에 Body의 계약을 세운다. 목표는 UI가 아니라 “저장하고 렌더할 수 있다”이다.

- `packages/schema`에 valibot `BodySchema`를 둔다: `doc` / `paragraph` / `heading`(2,3) / `text`+marks(bold, italic, code, link) / `hardBreak` / `bulletList` / `listItem` / `blockquote` / `codeBlock` / `horizontalRule`. `MediaId`는 branded type.
- `packages/editor`(없으면 admin 내부)에 Tiptap 확장 세트. **React 없는 spec 모듈**(attrs/parseHTML/renderHTML)과 **에디터 확장**(addNodeView)을 분리한다. API Worker는 spec만 import한다.
- API: 저장할 때 같은 트랜잭션에서 `html`과 `plaintext`를 만든다(ADR-0002). plaintext는 JSON에서 직접 뽑는다.
- 테스트(`@cloudflare/vitest-plugin`, Vitest 4.1.x):
  - 모르는 노드 타입은 parse 실패(400)
  - html 골든: 제목/문단/굵게/링크/목록/인용/코드/구분선
  - plaintext에 카드 텍스트가 들어간다
  - `wrangler dev`(workerd)에서 실제 응답을 확인
- 완료 기준: 본문 JSON을 POST하면 `html`/`plaintext`가 D1에 저장되고, 공개 읽기 API가 그대로 돌려준다.
