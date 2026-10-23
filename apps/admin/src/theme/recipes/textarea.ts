import { defineRecipe } from "@pandacss/dev";

export const textarea = defineRecipe({
  className: "textarea",
  base: {
    w: "full",
    minH: "20",
    px: "3",
    py: "2",
    borderRadius: "md",
    borderWidth: "1px",
    borderColor: "border",
    bg: "bg",
    color: "fg",
    fontSize: "md",
    resize: "vertical",
    _placeholder: { color: "fg.muted" },
    _focusVisible: {
      outline: "2px solid",
      outlineColor: "accent.bg",
      outlineOffset: "1px",
    },
    _invalid: { borderColor: "danger.subtle.fg" },
  },
});
