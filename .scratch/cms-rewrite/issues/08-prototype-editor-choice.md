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
