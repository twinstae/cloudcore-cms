import { defineRecipe } from "@pandacss/dev";

export const page = defineRecipe({
  className: "page",
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    maxW: "5xl",
    mx: "auto",
    px: { base: "4", md: "8" },
    py: "8",
  },
});
