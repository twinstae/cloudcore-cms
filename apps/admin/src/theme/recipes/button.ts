import { defineRecipe } from "@pandacss/dev";

export const button = defineRecipe({
  className: "button",
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "2",
    borderRadius: "md",
    fontWeight: "medium",
    borderWidth: "1px",
    borderColor: "transparent",
    cursor: "pointer",
    transition: "background-color 120ms, color 120ms, opacity 120ms",
    _disabled: { opacity: 0.5, cursor: "not-allowed" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "accent.bg",
      outlineOffset: "2px",
    },
  },
  defaultVariants: { tone: "neutral", size: "md" },
  variants: {
    tone: {
      primary: {
        bg: "accent.bg",
        color: "accent.fg",
        _hover: { bg: "accent.hover" },
      },
      neutral: {
        bg: "neutral.subtle.bg",
        color: "neutral.subtle.fg",
        _hover: { opacity: 0.85 },
      },
      ghost: {
        bg: "transparent",
        color: "fg.muted",
        _hover: { bg: "neutral.subtle.bg", color: "fg" },
      },
    },
    size: {
      sm: { h: "8", px: "2", fontSize: "sm" },
      md: { h: "9", px: "3", fontSize: "md" },
    },
  },
});
