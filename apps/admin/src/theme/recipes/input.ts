import { defineRecipe } from "@pandacss/dev";

export const input = defineRecipe({
  className: "input",
  base: {
    w: "full",
    h: "9",
    px: "3",
    borderRadius: "md",
    borderWidth: "1px",
    borderColor: "border",
    bg: "bg",
    color: "fg",
    fontSize: "md",
    _placeholder: { color: "fg.muted" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "accent.bg",
      outlineOffset: "1px",
    },
    _invalid: { borderColor: "danger.subtle.fg" },
  },
});
