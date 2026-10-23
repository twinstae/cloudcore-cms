import { expect, it, vi } from "vitest";
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
import { SetupScreen, type SetupValues } from "./SetupScreen";

it("8자 미만 비밀번호는 거부한다", async () => {
  await runSiheom(
    given.render(<SetupScreen onSubmit={async () => {}} />),
    actions.fill(query.textbox("이름"), "Owner"),
    actions.fill(query.textbox("이메일"), "owner@example.test"),
    actions.fill(query.label("비밀번호"), "short"),
    actions.click(query.button("Owner 만들기")),
    assertions.visible(query.alert("비밀번호는 8자 이상이어야 합니다")),
  );
});

it("값을 채워 제출하면 Owner 정보를 onSubmit으로 넘긴다", async () => {
  const submitted: SetupValues[] = [];

  await runSiheom(
    given.render(
      <SetupScreen
        onSubmit={async (values) => {
          submitted.push(values);
        }}
      />,
    ),
    actions.fill(query.textbox("이름"), "Owner"),
    actions.fill(query.textbox("이메일"), "owner@example.test"),
    actions.fill(query.label("비밀번호"), "owner-password-1"),
    actions.click(query.button("Owner 만들기")),
  );

  await vi.waitFor(() => expect(submitted).toHaveLength(1));
  expect(submitted[0]).toEqual({
    name: "Owner",
    email: "owner@example.test",
    password: "owner-password-1",
  });
});
