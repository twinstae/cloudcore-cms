import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeTag, sampleTags } from "../../test/fixtures/tags";
import { TagList } from "./TagList";

const meta = {
  title: "Tags/TagList",
  component: TagList,
  args: {
    tags: sampleTags,
    onEdit: () => {},
    onDelete: () => {},
  },
} satisfies Meta<typeof TagList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { tags: [] },
};

export const LongDescription: Story = {
  args: {
    tags: [
      ...sampleTags,
      makeTag({
        id: "01ARZ3NDEKTSV4RRFFQ69G5FAX",
        name: "긴 설명",
        slug: "long-description",
        description: "아주 긴 설명이 카드 안에서 어떻게 접히는지 확인하기 위한 문장입니다. ".repeat(
          4,
        ),
      }),
    ],
  },
};
