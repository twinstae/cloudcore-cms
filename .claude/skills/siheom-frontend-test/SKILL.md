---
name: siheom-frontend-test
description: >-
  Admin UI를 @siheom/react 래퍼로 검증한다. runSiheom(given → actions → assertions)으로
  접근성 이름을 통해 사용자 행동의 결과를 확인하며, 브라우저 조작·스크린샷 대신 이 테스트를 쓴다.
  폼·다이얼로그(Ark UI) 상호작용, 화면 상태 설계, 실패한 UI 테스트 디버깅에 쓴다.
---

# Siheom 프론트엔드 테스트

화면 확인은 브라우저가 아니라 테스트로 한다. 조회는 역할+접근성 이름으로만 한다.

## 진입점

- `apps/admin/src/test/siheom.tsx`만 import한다(`@siheom/react` 직접 import 금지). 래퍼가 `TestProvider`를 감싸고 `assertions.visible` 기본값을 "보임"으로 뒤집었다. 숨김은 `assertions.visible(target, false)`.
- 픽스처는 `apps/admin/src/test/fixtures/`에 두고 테스트와 story가 함께 쓴다.

## 실행

```bash
bun run check
cd apps/admin && bunx vitest run src/components/tags/TagsScreen.test.tsx
```

Playwright chromium browser mode다. jsdom이 아니라 실제 이벤트·포커스·CSS가 동작한다.

## 쓰는 법

- 행동 하나에 `it` 하나, 이름은 결과를 쓴다.
- `runSiheom(given.render(<X />), actions…, assertions…)`. 콜백 인자·저장값은 체인 밖에서 `expect`.
- 접근성 이름이 없으면 테스트를 우회하지 말고 컴포넌트를 고친다(`Label`, `aria-label`, `role`). placeholder·testid·CSS로 조회하지 않는다.
- 체인 안에서 `document`/`screen`을 직접 만지지 않는다. 실패 로그의 **A11y Snapshot**에서 이름을 읽어 `query`를 고친다.
- 다른 테스트의 중간 단계만 반복하는 테스트는 지운다.

## 화면과 URL 상태

라우트는 조회·mutation·navigate만 하고, 화면은 props로 받는다. URL이 상태를 정하면 그 값을 prop으로, 변경 요청은 콜백으로 노출한다.

```tsx
<TagsScreen tags={tags} editingId={edit} onEditingChange={goTo} onCreate={…} />
```

테스트에서는 라우트 대신 `useState` 하네스가 그 콜백을 받는다. 라우터 자체를 검증할 때만 `createMemoryHistory`.

## Ark UI 다이얼로그

닫힌 다이얼로그는 DOM에 `hidden`으로 남는다. 그래서 닫힘은 `assertions.visible(query.heading("Tag 수정"), false)`로 확인한다. 열려 있는 동안 배경은 `aria-hidden`이라 그 이름들은 조회되지 않는다.

## 더 알기

- [API.md](API.md) — 쿼리·액션·단언 카탈로그
- [docs/agents/conventions.md](../../../docs/agents/conventions.md) — 저장소 규칙(모킹 금지, visible 기본값 등)
