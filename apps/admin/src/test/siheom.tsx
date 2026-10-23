import { createDefaultActions, createDefaultAssertions, overrideSiheom } from "@siheom/core";
import { defaultGivens, reactEffects, reactFakeTimerScope } from "@siheom/react";
import type { ReactElement } from "react";
import { TestProvider } from "./TestProvider";

// 컴포넌트 테스트는 이 모듈의 runSiheom/given/actions/assertions/query만 쓴다.
// Provider(QueryClient 등)는 여기서 한 번 감싼다.
export const { runSiheom, given, actions, assertions, query, effect } = overrideSiheom(
  {
    givens: defaultGivens,
    actions: createDefaultActions(),
    assertions: createDefaultAssertions(),
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
