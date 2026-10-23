import { createDefaultActions, createDefaultAssertions, overrideSiheom } from "@siheom/core";
import { defaultGivens, reactEffects, reactFakeTimerScope } from "@siheom/react";
import type { ReactElement } from "react";
import { TestProvider } from "./TestProvider";

const baseAssertions = createDefaultAssertions();

// siheom의 visible은 expected를 생략하면 "보이지 않아야 함"이 된다. 테스트에서 방향을
// 거꾸로 쓰기 쉬워서, 이 래퍼에서는 생략하면 "보여야 함"으로 읽히게 한다.
const assertionsWithDefaultVisible = {
  ...baseAssertions,
  visible: (target: Parameters<typeof baseAssertions.visible>[0], expected = true) =>
    baseAssertions.visible(target, expected),
};

// 컴포넌트 테스트는 이 모듈의 runSiheom/given/actions/assertions/query만 쓴다.
// Provider(QueryClient 등)는 여기서 한 번 감싼다.
const overridden = overrideSiheom(
  {
    givens: defaultGivens,
    actions: createDefaultActions(),
    assertions: assertionsWithDefaultVisible,
    effects: reactEffects,
    fakeTimerScope: reactFakeTimerScope,
  },
  {
    givens: {
      render: (element: ReactElement) =>
        defaultGivens.render(<TestProvider>{element}</TestProvider>),
    },
  },
);

export const { runSiheom, given, actions, query, effect } = overridden;
export const assertions = overridden.assertions;

export { withFakeTimers } from "@siheom/react";
