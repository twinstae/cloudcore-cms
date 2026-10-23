import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LoginScreen, type LoginValues } from "../components/auth/LoginScreen";
import { authClient } from "../lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = Route.useNavigate();
  const [error, setError] = useState<string>();

  const handleSubmit = async (values: LoginValues) => {
    const { error: signInError } = await authClient.signIn.email(values);
    if (signInError) {
      setError("이메일 또는 비밀번호가 맞지 않습니다.");
      return;
    }
    setError(undefined);
    await navigate({ to: "/" });
  };

  return <LoginScreen onSubmit={handleSubmit} error={error} />;
}
