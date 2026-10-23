# Siheom API (이 저장소 기준)

```tsx
import { actions, assertions, effect, given, query, runSiheom, withFakeTimers } from "../../test/siheom";
```

`@siheom/react`/`@siheom/core`를 직접 import하지 않는다. 래퍼가 Provider와 `assertions.visible` 기본값을 조정한다.

## runSiheom

```tsx
await runSiheom(step1, step2, step3, …);
```

단계를 순서대로 실행한다. 실패하면 각 단계 로그와 페이지의 **A11y Snapshot**을 남긴다. `query` 이름을 고칠 때 이 스냅샷을 읽는다.

## given

| 단계 | 의미 |
| --- | --- |
| `given.render(element)` | Testing Library로 렌더. Provider는 래퍼가 감싼다. |

상태·스토리지·라우터 준비는 `setup()` 함수가 `given.render(…)`를 돌려주는 방식으로 한다. `given.setup`을 새로 만들지 않는다.

## query

`query.<role>(name)` — `name`은 문자열 또는 정규식.

| 역할 | 쓰임 |
| --- | --- |
| `textbox` | input/textarea — 연결된 `<label>` 텍스트로 조회 |
| `checkbox` | 라벨 또는 `aria-label` |
| `button` | 보이는 텍스트 또는 `aria-label` |
| `link` | `<a>`, `<Link>` |
| `listitem` | `<li>` — `aria-label` 또는 내용 |
| `region` | `aria-label`이 있는 landmark (`<section aria-label>`) |
| `status` | `role="status"` — 텍스트가 여러 노드로 쪼개지면 `aria-label` |
| `heading` | 제목. 다이얼로그 제목도 여기로 조회된다 |
| `dialog` | 모달 본문 |
| `form` | `<form>` 또는 `aria-label` |
| `label` | **라벨이 가리키는 컨트롤** (label 요소가 아니다) |
| `timer` | `role="timer"` |

그 외 `tab`, `tabpanel`, `combobox`, `radio`, `switch`, `progressbar`, `img`, `table` 등 Testing Library 역할을 쓸 수 있다.

이름이 겹치면 범위를 좁힌다.

```tsx
query.within(query.region("Tag 목록"), query.button("회고 수정"));
```

Ark UI 위젯은 트리거 역할이 다르다. Select류는 `query.combobox`, 다이얼로그는 `query.heading`/`query.dialog`를 스냅샷에서 확인하고 고른다.

## actions

| 액션 | 의미 |
| --- | --- |
| `click(target)` | 클릭 |
| `dblclick(target)` | 더블 클릭 |
| `hover(target)` | 포인터 올리기 |
| `fill(target, text)` | 비우고 입력. `{Enter}`, `{Escape}`, `{Tab}` 포함 가능 |
| `type(target, text)` | 비우지 않고 입력 |
| `tab(target)` | 포커스에서 Tab |
| `upload(target, file)` | 파일 입력 |

## assertions

| 단언 | 의미 |
| --- | --- |
| `visible(target)` / `visible(target, false)` | 보임 / 숨김(없음 또는 `aria-hidden`). 래퍼 기본값이 "보임"이다 |
| `not.visible(target)` | 숨김 |
| `focused(target)` / `not.focused` | 문서 포커스 |
| `checked(target)` / `not.checked` | 체크박스·라디오 상태 |
| `value(target, string)` / `not.value` | 입력값 |
| `textContent(target, string)` / `not.textContent` | 텍스트 |
| `disabled(target)` / `not.disabled` | 비활성 |
| `expanded(target)` / `not.expanded` | `aria-expanded` |
| `selected(target)` / `not.selected` | `aria-selected` |
| `current(target, "page")` / `not.current` | `aria-current` |
| `count(target, n)` / `not.count` | 일치 개수 |
| `href(target, url)` / `not.href` | 링크 href |
| `errormessage(target, msg)` / `not.errormessage` | 접근성 오류 메시지 |
| `description(target, msg)` | 접근성 설명 |
| `a11ySnapshot(target, "file.snap")` | `__snapshots__/`에 접근성 트리 저장 |
| `tableSnapshot(target, "file.snap")` | Markdown 표 스냅샷 |

## effect + withFakeTimers

타이머·`Date`에 기대는 UI는 해당 단계를 `withFakeTimers`로 감싸고 `effect.elapsed`로 시간을 진행한다.

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

`withFakeTimers` 안에서만 가짜 타이머가 적용된다. 액션마다 짧은 지연(~50ms)이 함께 흐른다.

## 래퍼 확장

Provider를 추가하려면 `apps/admin/src/test/siheom.tsx`의 `overrideSiheom`에 넣는다. `effects`와 `fakeTimerScope`를 함께 넘겨야 `withFakeTimers`가 동작한다.

```tsx
const overridden = overrideSiheom(
  { givens: defaultGivens, actions: createDefaultActions(), assertions: assertionsWithDefaultVisible, effects: reactEffects, fakeTimerScope: reactFakeTimerScope },
  { givens: { render: (element) => defaultGivens.render(<TestProvider>{element}</TestProvider>) } },
);
```

## Vitest

- browser mode(Playwright chromium, headless)라 실제 CSS·포커스·이벤트가 동작한다.
- 두 번째 렌더가 필요한 재로딩 시나리오는 `cleanup()` 후 다시 렌더한다(래퍼는 `@testing-library/react`의 자동 정리를 따른다).
- 스토리지 기반 상태는 테스트 시작 시 초기화한다.
