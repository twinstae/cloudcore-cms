import * as v from "valibot";
import { SimpleForm } from "../form/simple-form";
import { SimpleInput } from "../form/simple-field";
import { Button, Heading, Page } from "../ui";

export const SetupInput = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1, "이름을 입력하세요"), v.maxLength(100)),
  email: v.pipe(v.string(), v.trim(), v.email("이메일 형식이 아닙니다")),
  password: v.pipe(v.string(), v.minLength(8, "비밀번호는 8자 이상이어야 합니다")),
});

export type SetupValues = v.InferOutput<typeof SetupInput>;

type SetupScreenProps = {
  onSubmit: (values: SetupValues) => Promise<void>;
  error?: string | undefined;
};

export function SetupScreen({ onSubmit, error }: SetupScreenProps) {
  return (
    <Page>
      <Heading>Owner 설정</Heading>
      <p>Owner 계정을 만들면 공개 가입은 닫힙니다.</p>
      {error && (
        <p role="alert" aria-label={error}>
          {error}
        </p>
      )}
      <SimpleForm
        schema={SetupInput}
        defaultValues={{ name: "", email: "", password: "" }}
        onSubmit={onSubmit}
      >
        <SimpleInput name="name" label="이름" required />
        <SimpleInput name="email" label="이메일" type="email" required />
        <SimpleInput name="password" label="비밀번호" type="password" hint="8자 이상" required />
        <Button type="submit" tone="primary">
          Owner 만들기
        </Button>
      </SimpleForm>
    </Page>
  );
}
