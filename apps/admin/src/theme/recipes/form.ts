import { defineRecipe } from "@pandacss/dev";

export const form = defineRecipe({
  className: "form",
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
  },
});
