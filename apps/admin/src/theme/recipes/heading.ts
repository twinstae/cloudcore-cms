import { defineRecipe } from "@pandacss/dev";

export const heading = defineRecipe({
  className: "heading",
  base: { fontWeight: "bold", color: "fg", lineHeight: "tight" },
  defaultVariants: { size: "md" },
  variants: {
    size: {
      sm: { fontSize: "lg" },
      md: { fontSize: "2xl" },
      lg: { fontSize: "3xl" },
    },
  },
});
