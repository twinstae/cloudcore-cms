import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export function TestProvider({ children }: { children: ReactNode }) {
  // 테스트마다 캐시를 공유하지 않도록 렌더할 때마다 새로 만든다.
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
