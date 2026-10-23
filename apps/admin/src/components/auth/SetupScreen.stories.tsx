import type { Meta, StoryObj } from "@storybook/react-vite";
import { SetupScreen } from "./SetupScreen";

const meta = {
  title: "Auth/SetupScreen",
  component: SetupScreen,
  args: { onSubmit: async () => {} },
} satisfies Meta<typeof SetupScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
  args: { error: "Owner를 만들지 못했습니다. 이미 설정되었는지 확인하세요." },
};
