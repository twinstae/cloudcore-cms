import type { CreateTagInput } from "@cloudcore/schema";
import { expect, it, vi } from "vitest";
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
import { TagForm } from "./TagForm";

it("이름과 slug가 비면 검증 메시지를 보여준다", async () => {
  await runSiheom(
    given.render(<TagForm submitLabel="추가" onSubmit={async () => {}} />),
    actions.click(query.button("추가")),
    assertions.visible(query.alert("이름을 입력하세요"), true),
    assertions.visible(query.alert("slug를 입력하세요"), true),
  );
});

it("값을 채워 제출하면 trim된 값을 onSubmit으로 넘긴다", async () => {
  const submitted: CreateTagInput[] = [];

  await runSiheom(
    given.render(
      <TagForm
        submitLabel="추가"
        onSubmit={async (values) => {
          submitted.push(values);
        }}
      />,
    ),
    actions.fill(query.textbox("이름"), "  회고  "),
    actions.fill(query.textbox("slug"), "retro"),
    actions.fill(query.textbox("설명"), "한 주를 돌아본다"),
    actions.click(query.button("추가")),
    assertions.value(query.textbox("이름"), ""),
    assertions.value(query.textbox("slug"), ""),
  );

  await vi.waitFor(() => expect(submitted).toHaveLength(1));
  expect(submitted[0]).toMatchObject({
    name: "회고",
    slug: "retro",
    description: "한 주를 돌아본다",
  });
});

it("취소를 누르면 onCancel을 부른다", async () => {
  let cancelled = 0;

  await runSiheom(
    given.render(
      <TagForm
        submitLabel="저장"
        onCancel={() => {
          cancelled += 1;
        }}
        onSubmit={async () => {}}
      />,
    ),
    actions.click(query.button("취소")),
  );

  await vi.waitFor(() => expect(cancelled).toBe(1));
});
