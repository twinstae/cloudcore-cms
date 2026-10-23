---
name: siheom-frontend-test
description: >-
  React UI를 @siheom/react로 검증한다. 접근성 이름(역할+이름)으로 조회하고
  runSiheom(given → actions → assertions) 체인으로 사용자 행동의 결과를 확인한다.
  컴포넌트/화면 테스트, 폼·다이얼로그 상호작용, Ark UI, 테스트 가능한 화면 설계,
  실패한 UI 테스트 디버깅에 쓴다. 브라우저를 직접 조작하거나 스크린샷을 찍는 대신
  이 테스트로 검증한다.
---

# Siheom 프론트엔드 테스트

사용자가 보는 것(**접근성 이름**)으로 검증한다. CSS, placeholder, `data-testid`, 내부 상태로 조회하지 않는다.

## 이 저장소의 진입점

- 테스트는 `apps/admin/src/test/siheom.tsx`의 `runSiheom`/`given`/`actions`/`assertions`/`query`/`effect`/`withFakeTimers`만 import한다. `@siheom/react`를 직접 import하지 않는다.
- 래퍼가 `TestProvider`(QueryClient)를 감싸고, `assertions.visible`의 기본값을 "보여야 함"으로 뒤집었다. 숨김은 `assertions.visible(target, false)` 또는 `assertions.not.visible(target)`.
- 픽스처는 `apps/admin/src/test/fixtures/`에 두고 테스트와 story가 함께 쓴다. 예: `makeTag`, `sampleTags`.

## 명령

```bash
bun run check                                  # codegen → lint → format → deps → typecheck → test
cd apps/admin && bunx vitest run src/components/tags/TagsScreen.test.tsx
```

Vitest는 Playwright chromium(browser mode, headless)에서 돈다. jsdom이 아니다.

## 작성 순서

1. **행동 하나를 이름 짓는다.** `it("수정을 저장하면 onUpdate로 Tag와 입력값을 넘긴다")`처럼 결과를 쓴다.
2. **접근성 이름을 확인한다.** `query.*("…")`의 문자열이 실제 접근성 이름이어야 한다. 없으면 테스트를 우회하지 말고 컴포넌트를 고친다(`<Label>`, `aria-label`, `aria-labelledby`, `role`).
3. **픽스처/setup을 만든다.** 상태·Provider 준비가 반복되면 `setup()` 함수가 `given.render(…)`를 돌려주게 한다.
4. **체인을 쓴다.** render → act → assert 순서. `await runSiheom(given.render(<X />), actions.click(…), assertions.visible(…))`.
5. **필터 실행으로 이 파일만 돌린다.**
6. **다듬는다.** 다른 테스트의 중간 단계만 다시 말하는 테스트, 구현 상수를 검사하는 테스트는 지운다.

## 무엇을 어디서 검증하나

| 확인 | 위치 |
| --- | --- |
| 콜백 인자, `localStorage`, 저장된 값 | `runSiheom` 뒤에서 `let result` + `expect(…)` |
| 보임/숨김, 텍스트, 포커스, 입력값 | `runSiheom` 안의 `assertions.*` |
| 전체 접근성 트리 | `assertions.a11ySnapshot(query.region("…"), "이름.snap")` |

`runSiheom` 안에서는 `document.querySelector`, `screen.getByRole`, `expect(...).toBeVisible()`를 쓰지 않는다. 실패하면 러너가 단계 로그와 **A11y Snapshot**을 찍는다. 스냅샷에서 이름을 읽어 `query`를 고친다.

## 화면 컴포넌트 규칙

라우트는 데이터 조회와 콜백 배선만 하고, 화면은 props로 받는다. 그래야 라우터 없이 테스트할 수 있다.

```tsx
// 라우트: useSuspenseQuery + mutate + navigate
<TagsScreen tags={tags} editingId={edit} onEditingChange={goTo} onCreate={…} onUpdate={…} onDelete={…} />

// 테스트: 라우트가 URL에 하던 일을 useState가 대신한다
function Harness({ initialEditingId }: { initialEditingId?: string }) {
  const [editingId, setEditingId] = useState(initialEditingId);
  return <TagsScreen tags={sampleTags} editingId={editingId} onEditingChange={setEditingId} … />;
}
```

URL이 화면 상태를 정하면 그 상태를 prop(`editingId`)으로 노출하고, 변경 요청은 콜백(`onEditingChange`)으로 올린다. 라우터 자체를 검증할 때만 `createMemoryHistory`를 쓴다.

## 다이얼로그 (Ark UI)

- Ark Dialog는 닫혀도 DOM에 남고 `hidden`이 된다. 그래서 `assertions.visible(query.heading("Tag 수정"), false)`로 닫힘을 확인한다.
- 제목은 `query.heading`, 본문은 `query.textbox`/`query.button`으로 조회한다. 배경 콘텐츠는 `aria-hidden`이라 이름이 사라진다.
- 취소 버튼과 `onOpenChange`가 같은 상태를 닫는지 한 테스트에서 확인한다(`여는 버튼 → 채우기 → 제출 → 닫힘`).

## 안티패턴

- **부분 테스트**: "다이얼로그가 열린다"만 따로 두지 말고 열기 → 입력 → 제출 → 닫힘을 한 `it`에 담는다.
- **동어반복**: 컴포넌트가 노출하지 않는 상수나 내부 키를 검사하지 않는다.
- **모킹**: `vi.mock`/`vi.fn`/`vi.spyOn`은 금지(oxlint). 의존성은 props로 주입하고 fake 객체를 넘긴다.
- **브라우저 조작**: 화면 확인이 필요하면 테스트를 쓴다. 브라우저 조작·스크린샷은 사용자가 명시적으로 요청할 때만 한다.

## 참고

- API 카탈로그: [API.md](API.md)
- 저장소 컨벤션: [docs/agents/conventions.md](../../../docs/agents/conventions.md)
