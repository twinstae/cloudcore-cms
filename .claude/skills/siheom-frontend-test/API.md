# Siheom API

`apps/admin/src/test/siheom.tsx`에서 import한다.

```tsx
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
```

## runSiheom

`await runSiheom(given.render(<X />), actions…, assertions…)` — 순서대로 실행하고, 실패하면 단계 로그와 A11y Snapshot을 남긴다.

`given`은 `given.render(element)` 하나뿐이다. 상태·Provider 준비는 `setup()` 함수가 `given.render(…)`를 돌려주게 한다.

## query

`query.<role>(name)` — 문자열 또는 정규식. Testing Library의 `getByRole`/`getByLabelText`다.

| 역할 | 쓰임 |
| --- | --- |
| `textbox` / `checkbox` / `button` / `link` | 라벨 또는 접근성 이름 |
| `heading` / `dialog` / `region` / `status` | 제목, 다이얼로그, `aria-label` landmark, `role="status"` |
| `listitem` / `list` | `aria-label`이 있는 목록 |
| `label` | 라벨이 가리키는 컨트롤(label 요소가 아니다) |
| `combobox` | Ark UI Select류 트리거 |

그 외 `tab`, `switch`, `radio`, `progressbar`, `img`, `timer` 등 Testing Library 역할을 쓴다. 이름이 겹치면 `query.within(container, target)`.

## actions

`click`, `dblclick`, `hover`, `fill`(비우고 입력, `{Enter}`/`{Escape}` 가능), `type`(비우지 않음), `tab`, `upload`.

## assertions

`visible(target)` / `visible(target, false)`, `not.visible`, `focused`, `checked`, `value`, `textContent`, `disabled`, `expanded`, `selected`, `current(target, "page")`, `count`, `href`, `errormessage`, `description`, `a11ySnapshot(target, "파일.snap")`.

## 타이머

`withFakeTimers(...steps)` 안에서 `effect.elapsed(ms)`로 시간을 진행한다.

```tsx
await runSiheom(
  withFakeTimers(
    given.render(<Countdown durationMinutes={25} />),
    actions.click(query.button("시작")),
    effect.elapsed(1_000),
    assertions.textContent(query.timer("남은 시간"), "24:59"),
  ),
);
```

## 래퍼 확장

Provider를 추가할 때는 `siheom.tsx`의 `overrideSiheom`에 `effects`와 `fakeTimerScope`를 함께 넘겨야 `withFakeTimers`가 동작한다.
