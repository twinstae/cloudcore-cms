import { defineRecipe } from "@pandacss/dev";

export const fieldRoot = defineRecipe({
  className: "fieldRoot",
  base: { display: "flex", flexDirection: "column", gap: "1" },
});

export const fieldLabel = defineRecipe({
  className: "fieldLabel",
  base: { fontSize: "sm", fontWeight: "medium", color: "fg" },
});

export const fieldHelper = defineRecipe({
  className: "fieldHelper",
  base: { fontSize: "sm", color: "fg.muted" },
});

export const fieldError = defineRecipe({
  className: "fieldError",
  base: { fontSize: "sm", color: "danger.subtle.fg" },
});
