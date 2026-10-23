import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth";

// 로그인 없이 열 수 있는 화면. 나머지는 세션을 확인하고 /login으로 보낸다.
const PUBLIC_PATHS = new Set(["/login", "/setup"]);

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    if (PUBLIC_PATHS.has(location.pathname)) return;
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
  component: Outlet,
});
