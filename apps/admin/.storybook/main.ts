import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const styledSystem = path.resolve(dir, "../styled-system");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  framework: { name: "@storybook/react-vite", options: {} },
  viteFinal(viteConfig) {
    // Storybook은 앱의 vite.config.ts를 쓰지 않는다. Panda 산출물 경로만 직접 잇는다.
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = { ...viteConfig.resolve.alias, "styled-system": styledSystem };
    return viteConfig;
  },
};

export default config;
