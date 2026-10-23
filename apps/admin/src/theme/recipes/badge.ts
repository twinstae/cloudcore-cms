import { defineRecipe } from "@pandacss/dev";

export const badge = defineRecipe({
  className: "badge",
  base: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "md",
    px: "2",
    h: "6",
    fontSize: "sm",
    fontWeight: "medium",
    whiteSpace: "nowrap",
  },
  defaultVariants: { tone: "neutral" },
  variants: {
    tone: {
      neutral: { bg: "neutral.subtle.bg", color: "neutral.subtle.fg" },
      success: { bg: "success.subtle.bg", color: "success.subtle.fg" },
      danger: { bg: "danger.subtle.bg", color: "danger.subtle.fg" },
    },
  },
});
