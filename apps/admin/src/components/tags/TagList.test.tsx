import type { Tag } from "@cloudcore/schema";
import { expect, it, vi } from "vitest";
import { makeTag, sampleTags } from "../../test/fixtures/tags";
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
import { TagList } from "./TagList";

const [retro, dev] = sampleTags;
const extra = makeTag({ id: "01ARZ3NDEKTSV4RRFFQ69G5FAX", name: "공지", slug: "notice" });

it("Tag를 이름, slug, 설명과 함께 보여준다", async () => {
  await runSiheom(
    given.render(<TagList tags={[retro!, dev!]} onEdit={() => {}} onDelete={() => {}} />),
    assertions.visible(query.region("Tag 목록")),
    assertions.textContent(query.heading("회고"), "회고"),
    assertions.textContent(query.status("회고 slug"), "retro"),
    assertions.textContent(query.heading("개발"), "개발"),
    assertions.visible(query.button("회고 수정")),
    assertions.visible(query.button("개발 삭제")),
  );
});

it("Tag가 없으면 빈 상태를 보여준다", async () => {
  await runSiheom(
    given.render(<TagList tags={[]} onEdit={() => {}} onDelete={() => {}} />),
    assertions.textContent(query.region("Tag 목록"), "아직 Tag가 없습니다"),
  );
});

it("수정과 삭제는 해당 Tag를 콜백으로 넘긴다", async () => {
  const edited: Tag[] = [];
  const deleted: Tag[] = [];

  await runSiheom(
    given.render(
      <TagList
        tags={[retro!, extra]}
        onEdit={(value) => edited.push(value)}
        onDelete={(value) => deleted.push(value)}
      />,
    ),
    actions.click(query.button("회고 수정")),
    actions.click(query.button("공지 삭제")),
  );

  await vi.waitFor(() => {
    expect(edited).toEqual([retro]);
    expect(deleted).toEqual([extra]);
  });
});
