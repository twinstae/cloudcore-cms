import { defineConfig } from "@pandacss/dev";
import { recipes } from "./src/theme/recipes";
import { semanticTokens } from "./src/theme/semantic-tokens";

export default defineConfig({
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda"],
  preflight: true,
  include: ["./src/**/*.{ts,tsx}"],
  outdir: "styled-system",
  jsxFramework: "react",
  conditions: {
    extend: {
      // 시스템 설정을 따르되, <html data-theme="light|dark">로 덮어쓸 수 있다.
      dark: "[data-theme=dark] &, @media (prefers-color-scheme: dark) { :root:not([data-theme=light]) & }",
    },
  },
  theme: {
    extend: { recipes, semanticTokens },
  },
  globalCss: {
    body: { bg: "bg", color: "fg" },
  },
});
