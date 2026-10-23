import * as v from "valibot";
import { SimpleForm } from "../form/simple-form";
import { SimpleInput } from "../form/simple-field";
import { Button, Heading, Page } from "../ui";

export const LoginInput = v.object({
  email: v.pipe(v.string(), v.trim(), v.email("이메일 형식이 아닙니다")),
  password: v.pipe(v.string(), v.minLength(1, "비밀번호를 입력하세요")),
});

export type LoginValues = v.InferOutput<typeof LoginInput>;

type LoginScreenProps = {
  onSubmit: (values: LoginValues) => Promise<void>;
  error?: string | undefined;
};

export function LoginScreen({ onSubmit, error }: LoginScreenProps) {
  return (
    <Page>
      <Heading>로그인</Heading>
      {error && (
        <p role="alert" aria-label={error}>
          {error}
        </p>
      )}
      <SimpleForm
        schema={LoginInput}
        defaultValues={{ email: "", password: "" }}
        onSubmit={onSubmit}
      >
        <SimpleInput name="email" label="이메일" type="email" required />
        <SimpleInput name="password" label="비밀번호" type="password" required />
        <Button type="submit" tone="primary">
          로그인
        </Button>
      </SimpleForm>
    </Page>
  );
}
