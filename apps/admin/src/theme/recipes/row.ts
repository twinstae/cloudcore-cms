import { defineRecipe } from "@pandacss/dev";

export const row = defineRecipe({
  className: "row",
  base: {
    display: "flex",
    alignItems: "center",
    gap: "2",
  },
  defaultVariants: { justify: "start" },
  variants: {
    justify: {
      start: { justifyContent: "flex-start" },
      end: { justifyContent: "flex-end" },
      between: { justifyContent: "space-between" },
    },
  },
});
