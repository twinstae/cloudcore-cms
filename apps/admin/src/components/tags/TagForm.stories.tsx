import type { Meta, StoryObj } from "@storybook/react-vite";
import { TagForm } from "./TagForm";

const meta = {
  title: "Tags/TagForm",
  component: TagForm,
  args: {
    submitLabel: "추가",
    onSubmit: async () => {},
  },
} satisfies Meta<typeof TagForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Edit: Story = {
  args: {
    submitLabel: "저장",
    defaultValues: { name: "회고", slug: "retro", description: "한 주를 돌아본다" },
    onCancel: () => {},
  },
};
