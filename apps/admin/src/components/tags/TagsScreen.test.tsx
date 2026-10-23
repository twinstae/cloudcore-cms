import type { CreateTagInput, Tag } from "@cloudcore/schema";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { sampleTags } from "../../test/fixtures/tags";
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
import { TagsScreen } from "./TagsScreen";

const noop = async () => {};

// 라우트처럼 URL 상태를 부모가 들고 있는 상황을 흉내낸다.
function Harness({
  tags = sampleTags,
  initialEditingId,
  onCreate = noop,
  onUpdate = noop,
  onDelete = () => {},
}: {
  tags?: readonly Tag[];
  initialEditingId?: string;
  onCreate?: (values: CreateTagInput) => Promise<void>;
  onUpdate?: (tag: Tag, values: CreateTagInput) => Promise<void>;
  onDelete?: (tag: Tag) => void;
}) {
  const [editingId, setEditingId] = useState<string | undefined>(initialEditingId);
  return (
    <TagsScreen
      tags={tags}
      editingId={editingId}
      onEditingChange={setEditingId}
      onCreate={onCreate}
      // 라우트는 저장 후 URL에서 edit을 지운다.
      onUpdate={async (tag, values) => {
        await onUpdate(tag, values);
        setEditingId(undefined);
      }}
      onDelete={onDelete}
    />
  );
}

it("새 Tag를 제출하면 onCreate로 값을 넘기고 다이얼로그를 닫는다", async () => {
  const created: CreateTagInput[] = [];

  await runSiheom(
    given.render(
      <Harness
        onCreate={async (values) => {
          created.push(values);
        }}
      />,
    ),
    actions.click(query.button("새 Tag")),
    assertions.visible(query.heading("새 Tag")),
    actions.fill(query.textbox("이름"), "공지"),
    actions.fill(query.textbox("slug"), "notice"),
    actions.fill(query.textbox("설명"), "새 소식"),
    actions.click(query.button("추가")),
    assertions.visible(query.heading("새 Tag"), false),
  );

  await vi.waitFor(() => expect(created).toHaveLength(1));
  expect(created[0]).toMatchObject({ name: "공지", slug: "notice", description: "새 소식" });
});

it("수정 버튼은 그 Tag를 편집 대상으로 열고, 값이 채워진 다이얼로그를 보여준다", async () => {
  await runSiheom(
    given.render(<Harness />),
    actions.click(query.button("회고 수정")),
    assertions.visible(query.heading("Tag 수정")),
    assertions.value(query.textbox("이름"), "회고"),
    assertions.value(query.textbox("slug"), "retro"),
  );
});

it("수정을 저장하면 onUpdate로 Tag와 입력값을 넘긴다", async () => {
  const updated: Array<[Tag, CreateTagInput]> = [];
  const retro = sampleTags[0]!;

  await runSiheom(
    given.render(
      <Harness
        initialEditingId={retro.id}
        onUpdate={async (tag, values) => {
          updated.push([tag, values]);
        }}
      />,
    ),
    actions.fill(query.textbox("이름"), "회고2"),
    actions.click(query.button("저장")),
    assertions.visible(query.heading("Tag 수정"), false),
  );

  await vi.waitFor(() => expect(updated).toHaveLength(1));
  expect(updated[0]?.[0].id).toBe(retro.id);
  expect(updated[0]?.[1]).toMatchObject({ name: "회고2", slug: "retro" });
});

it("수정 다이얼로그의 취소는 편집을 끝낸다", async () => {
  await runSiheom(
    given.render(<Harness initialEditingId={sampleTags[0]!.id} />),
    actions.click(query.button("취소")),
    assertions.visible(query.heading("Tag 수정"), false),
  );
});

it("삭제 버튼은 그 Tag를 onDelete로 넘긴다", async () => {
  const deleted: Tag[] = [];

  await runSiheom(
    given.render(
      <Harness
        onDelete={(tag) => {
          deleted.push(tag);
        }}
      />,
    ),
    actions.click(query.button("개발 삭제")),
  );

  await vi.waitFor(() => expect(deleted).toHaveLength(1));
  expect(deleted[0]?.id).toBe(sampleTags[1]!.id);
});
