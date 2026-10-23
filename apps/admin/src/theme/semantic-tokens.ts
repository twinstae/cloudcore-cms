import { defineSemanticTokens } from "@pandacss/dev";

const subtle = (color: string) => ({
  bg: { value: { base: `{colors.${color}.100}`, _dark: `{colors.${color}.900}` } },
  fg: { value: { base: `{colors.${color}.800}`, _dark: `{colors.${color}.100}` } },
});

export const semanticTokens = defineSemanticTokens({
  colors: {
    bg: { value: { base: "{colors.white}", _dark: "{colors.neutral.950}" } },
    fg: {
      DEFAULT: { value: { base: "{colors.neutral.900}", _dark: "{colors.neutral.100}" } },
      muted: { value: { base: "{colors.neutral.600}", _dark: "{colors.neutral.400}" } },
    },
    border: { value: { base: "{colors.neutral.200}", _dark: "{colors.neutral.800}" } },
    accent: {
      bg: { value: { base: "{colors.blue.600}", _dark: "{colors.blue.500}" } },
      hover: { value: { base: "{colors.blue.700}", _dark: "{colors.blue.400}" } },
      fg: { value: { base: "{colors.white}", _dark: "{colors.neutral.950}" } },
    },
    neutral: { subtle: subtle("neutral") },
    success: { subtle: subtle("green") },
    danger: { subtle: subtle("red") },
  },
});
