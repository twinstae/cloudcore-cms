# 어떤 에디터를 쓸 것인가 (Koenig, Lexical, Tiptap)

Label: wayfinder:prototype
Type: prototype
Status: open
Blocked by: 05

## Question

05의 research를 바탕으로 1~2개 후보로 작은 spike를 만들어 보고 에디터를 결정한다. spike에서 확인할 것:
- Ghost 같은 글쓰기 경험(슬래시 메뉴나 + 메뉴, 인라인 서식, 링크)
- **image Card**(업로드 hook에 fake 주입)와 **CTA 버튼 Card** 하나씩
- Body JSON에서 `html`과 `plaintext`를 **Workers 런타임에서** 렌더링할 수 있는지(ADR-0002)
- **`@siheom/ime`로 한국어 조합 입력 테스트** 1개, `@siheom/react` 상호작용 테스트 1개, Storybook story 1개
- Panda 스타일, 다크모드와 함께 쓸 수 있는지

**07 조사 결과 참고**: `@siheom/ime`는 기본 Chromium 프로필에서 contenteditable 입력을 user-event로 넘기므로 한글 조합을 에뮬레이션하지 않는다. `@siheom/ime-cdp`로 contenteditable 조합을 테스트할 수 있는지 확인하고, 안 되면 "에디터 한국어 입력은 `@siheom/ime`로 테스트" 결정을 다시 연다.

**05 조사 결과 반영**: Koenig는 Lexical 0.13.1 고정과 한글 입력 버그(Ghost #29220)를 안고 간다. Koenig를 고르려면 버그 재현 여부를 먼저 확인하고, 직접 고치거나 fork할지 정해야 한다. IME 테스트 전략도 여기서 정한다. 선택지는 (a) `@siheom/ime-cdp`를 contenteditable용으로 감싸기, (b) Firefox 프로필 + UA shim, (c) siheom-ts에 Chrome contenteditable player를 기여하기다.

결과로 에디터를 정하고, Card 7종을 구현하는 방식과 Body JSON 스키마의 형태(valibot으로 parse할 범위)를 정리한다.

## 재검토 (2026-10-23)

아래 "이전 판단"은 사용자가 거부했다. "Lexical 0.13.1 고정 + #29220 때문에 탈락"은 근거가 약하다: 버그는 재현되지 않았고, 고칠 수 있는지와 비용은 측정하지 않았다. 다시 결정할 때까지 **에디터는 미정**이다.

이 티켓은 에디터와 무관한 구현(뼈대, Tag, 인증, Post 메타데이터)을 막지 않는다. 다시 열 때는 리서치를 늘리지 말고 **반나절 timebox 스파이크 하나**로 끝낸다.
1. keydown 229 → compositionstart 순서를 만드는 하네스로 Koenig 1.13에서 #29220이 재현되는지 본다. 재현되지 않으면 IME는 Koenig 탈락 사유가 아니다.
2. 재현되면 Lexical 쪽 수정을 patch-package로 얹어 보고 그 diff 크기와 테스트 통과 여부를 적는다. 이게 "고치는 비용"의 실측이다.

이전 판단에서 놓친 점: 08 측정의 Koenig 서버 렌더는 100블록 28–48ms(wall)라 무료 플랜 CPU 10ms(ADR-0005)와 부딪힐 수 있다. 하지만 Site가 정적 빌드(ADR-0004)이므로 html 렌더를 API 요청이 아니라 Site Build(또는 Admin 브라우저)에서 하면 이 비용은 사라진다. 이 경우 "Worker 번들/렌더 속도"는 비교 기준에서 빠지고, ADR-0002의 "저장할 때 렌더"를 고쳐야 한다. 에디터를 다시 고를 때 함께 정한다.

## 이전 판단 (거부됨)

**결정: Tiptap 3(3.32)으로 간다. Koenig는 쓰지 않는다.**

프로토타입: 브랜치 `prototype/08-editor`, `prototypes/08-editor/` (throwaway). 실행법과 전체 측정값은 `NOTES.md`.

### 1. 근거 (직접 측정)

| 기준 | Tiptap 3.32 | Koenig 1.13 (Lexical 0.13.1) |
|---|---|---|
| React 19 | peer에 `^17‖^18‖^19` 명시. 그대로 마운트 | 마운트는 된다. peer 선언이 없고 React 18.3.1 번들이다. Vite에서 `resolve.dedupe` + `optimizeDeps.include` 없이는 hook 오류(React 사본 분리)가 난다 |
| 서버 렌더 (workerd) | 됨. `nodejs_compat` 불필요 | 됨. `nodejs_compat` + linkedom + jsdom alias 필요 |
| Worker 번들 | 860.44 KiB / **gzip 196.75 KiB** | 1808.60 KiB / **gzip 404.91 KiB** |
| 100블록 본문 렌더 wall (로컬) | ~10ms (HTTP 왕복 포함) | 28–48ms |
| Card 마크업 | 우리가 소유 (`cc-image-card`, `cc-cta`) | Ghost 테마 class (`kg-card kg-image-card`, `kg-btn kg-btn-accent`) |
| Card 구현 | headless. spec + node view를 직접 | 30종 내장. 단 노드 정의가 Lexical 0.13.1 API에 묶인다 |
| 에디터 UI | 직접 구현(+ 메뉴, 툴바) | Ghost UI 내장. 문자열 영어 고정, Tailwind CSS가 Panda layer 밖이라 에디터 안에서는 Panda보다 우선 |
| 한글 조합 (CDP, 빈 문단) | 통과 (DOM + 에디터 상태) | 통과. Ghost #29220은 재현되지 않았다 — 재현 실패이지 해결 증명이 아니다 |

Koenig를 고르지 않은 이유는 기능 부족이 아니라 **우리가 통제할 수 없는 고정** 때문이다. Lexical 0.13.1(2024-01)에 묶여 있고, 그 버전의 한글 시작 입력 버그가 open이며, UI 문자열과 Card 마크업이 Ghost에 맞춰져 있다. 한국어만 지원하는 제품에서 가장 큰 위험을 남기고 시작하게 된다.

### 2. Card 7종 구현 방식

**spec과 node view를 나눈다.** Card 하나당 두 파일이다.

```
src/body/tiptap-nodes.ts      # React 없음: attrs, parseHTML, renderHTML
src/editors/tiptap/*View.tsx  # 에디터 전용: ReactNodeViewRenderer
```

`createImageCardNode(nodeView?)`처럼 공장을 두고, API Worker와 재렌더링 스크립트는 node view 없이 같은 spec을 import한다. 이렇게 해야 서버 번들에 React와 에디터 UI가 딸려 가지 않는다. `renderHTML`이 유일한 마크업 출처이므로 서버 렌더와 에디터가 갈라지지 않는다.

| Card | 구현 |
|---|---|
| image | `Node`(atom, block) + node view. attrs `src/alt/caption/mediaId/width/height`. 업로드는 `upload(file) => {src, mediaId, width, height}`를 props로 주입(스파이크는 fake, 실제는 R2+Images) |
| cta | `Node` + node view. attrs `label/href/variant`. Site CSS는 `cc-cta` 하나 |
| code | StarterKit `codeBlock` + `language` attr |
| divider | StarterKit `horizontalRule` |
| callout | `Node` + node view. attrs `tone`, 내용은 inline text |
| html | `Node`(atom). attrs `html`. 입력 시 sanitize 정책은 아직 미정(맵의 Not yet specified) |
| embed | `Node`(atom). attrs `url/provider/html`. oEmbed를 서버에서 가져올지는 미정 |

Card 추가는 항상 4종 세트다: valibot 스키마, spec(`renderHTML`), node view, 서버 렌더 테스트. 배포 순서 주의 — 구버전 API는 새 노드 타입을 거부한다.

### 3. Body JSON과 valibot parse 범위

Tiptap의 네이티브 JSON을 그대로 저장한다.

```ts
{ type: 'doc', content: [
  { type: 'paragraph', content: [{ type: 'text', text: '본문', marks: [{ type: 'bold' }] }] },
  { type: 'imageCard', attrs: { src, alt, caption, mediaId, width, height } },
  { type: 'ctaCard', attrs: { label, href, variant } },
]}
```

- `packages/schema`에 `BodySchema`를 두고 **HTTP 경계에서 parse**한다(생성/수정/자동 저장). 렌더 직전에 한 번 더 parse해 방어한다. DB row는 drizzle이 타입을 주므로 별도 parse하지 않는다.
- `MediaId`는 branded type. `Mark`/`BlockNode`는 discriminated union. 지원하지 않는 `type`은 parse 실패 → 400. 이게 “모르는 Card를 Site가 만나지 않는다”는 보장이다.
- 재귀(blockquote/list)는 valibot `v.lazy`로 스키마를 만들고, TS 타입은 순환 참조 때문에 손으로 쓴다(`BlockNode`). 노드 종류를 늘릴 때 둘을 함께 고친다.
- plaintext는 **JSON에서 바로** 만든다(DOM 불필요). Koenig는 plaintext도 DOM이 필요했다.

### 4. IME 테스트 전략 (결정)

**(a) `@siheom/ime-cdp`를 contenteditable용으로 감싼다.** 채택.

- `composeHangulCdp`는 `HTMLInputElement | HTMLTextAreaElement` 시그니처고 `element.value`를 prefix로 읽는다. contenteditable에는 `.value`가 없어 `undefined` prefix가 되지만 동작한다. 빈 문단은 이대로 통과한다.
- 검증: Tiptap과 Koenig 모두, 빈 문단 맨 앞에서 “안녕하세요”를 CDP `Input.imeSetComposition`으로 넣고 **DOM과 에디터 상태(저장될 JSON) 둘 다** 확인했다. 두 테스트 모두 통과.
- 문장 중간 조합은 caret 앞 텍스트를 읽는 얇은 래퍼가 필요하다(`element.value` 대신 Range). 테스트 유틸로 만든다.
- **한계**: CDP는 `keydown(keyCode 229) → compositionstart` 순서를 그대로 만들지 않는다. 그래서 Ghost #29220이 재현되지 않았고, 이 하네스로는 IME 버그의 재현/해결을 판정할 수 없다. (b) Firefox contenteditable 프로필 + UA shim은 지금 필요 없다. (c) Chrome contenteditable player 기여는 Tiptap #4108(조합 중 Enter) 같은 synthetic 순서가 필요해질 때 한다.

### 5. 남은 위험

- **Tiptap #4108**(조합 중 Enter로 마지막 음절 소실)은 이 스파이크에서 테스트하지 않았다. 에디터 셸 티켓에서 회귀 테스트를 먼저 만든다.
- 슬래시 메뉴, 링크 입력 규칙, 키보드 접근성은 Tiptap이 headless라 직접 만들어야 한다(스파이크는 + 메뉴와 툴바만 확인).
- Koenig를 다시 검토하려면 Lexical 업그레이드/fork 비용을 먼저 계산해야 한다.

Context: 브랜치 `prototype/08-editor`, `prototypes/08-editor/NOTES.md`
