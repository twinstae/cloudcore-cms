import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { SetupScreen, type SetupValues } from "../components/auth/SetupScreen";
import { createOwner, setupQueryOption } from "../queries/setup";

export const Route = createFileRoute("/setup")({
  loader: async ({ context }) => {
    const { required } = await context.queryClient.ensureQueryData(setupQueryOption);
    // Owner가 이미 있으면 이 화면은 닫힌다.
    if (!required) throw redirect({ to: "/login" });
  },
  component: SetupRoute,
  errorComponent: () => <p>설정 상태를 확인하지 못했습니다.</p>,
});

function SetupRoute() {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string>();

  const handleSubmit = async (values: SetupValues) => {
    try {
      await createOwner(values);
    } catch {
      setError("Owner를 만들지 못했습니다. 이미 설정되었는지 확인하세요.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: setupQueryOption.queryKey });
    await navigate({ to: "/login" });
  };

  return <SetupScreen onSubmit={handleSubmit} error={error} />;
}
