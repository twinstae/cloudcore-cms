import { decodeTag, type Tag } from "@cloudcore/schema";
import { expect, it, vi } from "vitest";
import { actions, assertions, given, query, runSiheom } from "../../test/siheom";
import { TagList } from "./TagList";

const tag = (id: string, name: string, slug: string, description = ""): Tag => {
  const decoded = decodeTag({
    id,
    name,
    slug,
    description,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  if (decoded.isErr()) throw decoded.error;
  return decoded.value;
};

const retro = tag("01ARZ3NDEKTSV4RRFFQ69G5FAV", "회고", "retro", "한 주를 돌아본다");
const dev = tag("01ARZ3NDEKTSV4RRFFQ69G5FAW", "개발", "dev");

it("Tag를 이름, slug, 설명과 함께 보여준다", async () => {
  await runSiheom(
    given.render(<TagList tags={[retro, dev]} onEdit={() => {}} onDelete={() => {}} />),
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
        tags={[retro, dev]}
        onEdit={(value) => edited.push(value)}
        onDelete={(value) => deleted.push(value)}
      />,
    ),
    actions.click(query.button("회고 수정")),
    actions.click(query.button("개발 삭제")),
  );

  await vi.waitFor(() => {
    expect(edited).toEqual([retro]);
    expect(deleted).toEqual([dev]);
  });
});
