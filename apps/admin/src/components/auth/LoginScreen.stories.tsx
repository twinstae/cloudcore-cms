import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoginScreen } from "./LoginScreen";

const meta = {
  title: "Auth/LoginScreen",
  component: LoginScreen,
  args: { onSubmit: async () => {} },
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Error: Story = {
  args: { error: "이메일 또는 비밀번호가 맞지 않습니다." },
};
