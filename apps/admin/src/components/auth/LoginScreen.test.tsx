import { expect, it, vi } from "vitest";
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
import { type LoginValues, LoginScreen } from "./LoginScreen";

it("빈 값으로 제출하면 검증 메시지를 보여준다", async () => {
  await runSiheom(
    given.render(<LoginScreen onSubmit={async () => {}} />),
    actions.click(query.button("로그인")),
    assertions.visible(query.alert("이메일 형식이 아닙니다")),
    assertions.visible(query.alert("비밀번호를 입력하세요")),
  );
});

it("값을 채워 제출하면 이메일과 비밀번호를 onSubmit으로 넘긴다", async () => {
  const submitted: LoginValues[] = [];

  await runSiheom(
    given.render(
      <LoginScreen
        onSubmit={async (values) => {
          submitted.push(values);
        }}
      />,
    ),
    actions.fill(query.textbox("이메일"), " owner@example.test "),
    actions.fill(query.label("비밀번호"), "password-1234"),
    actions.click(query.button("로그인")),
  );

  await vi.waitFor(() => expect(submitted).toHaveLength(1));
  expect(submitted[0]).toEqual({ email: "owner@example.test", password: "password-1234" });
});

it("실패 메시지를 보여준다", async () => {
  await runSiheom(
    given.render(
      <LoginScreen onSubmit={async () => {}} error="이메일 또는 비밀번호가 맞지 않습니다." />,
    ),
    assertions.visible(query.alert("이메일 또는 비밀번호가 맞지 않습니다.")),
  );
});
