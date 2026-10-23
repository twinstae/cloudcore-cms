import { defineRecipe } from "@pandacss/dev";

export const tagListRoot = defineRecipe({
  className: "tagListRoot",
  base: { w: "full" },
});

export const tagListList = defineRecipe({
  className: "tagListList",
  base: {
    listStyle: "none",
    m: "0",
    p: "0",
    display: "flex",
    flexDirection: "column",
    gap: "2",
  },
});

export const tagListItem = defineRecipe({
  className: "tagListItem",
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2",
    p: "4",
    borderWidth: "1px",
    borderColor: "border",
    borderRadius: "md",
  },
});

export const tagListHead = defineRecipe({
  className: "tagListHead",
  base: { display: "flex", alignItems: "center", gap: "3", flexWrap: "wrap" },
});

export const tagListDescription = defineRecipe({
  className: "tagListDescription",
  base: { m: "0", fontSize: "sm", color: "fg.muted" },
});

export const tagListActions = defineRecipe({
  className: "tagListActions",
  base: { display: "flex", gap: "2" },
});
