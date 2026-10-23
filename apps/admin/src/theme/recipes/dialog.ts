import { defineRecipe } from "@pandacss/dev";

export const dialogBackdrop = defineRecipe({
  className: "dialogBackdrop",
  base: {
    position: "fixed",
    inset: "0",
    bg: "neutral.950/50",
  },
});

export const dialogPositioner = defineRecipe({
  className: "dialogPositioner",
  base: {
    position: "fixed",
    inset: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    p: "4",
  },
});

export const dialogContent = defineRecipe({
  className: "dialogContent",
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "4",
    w: "full",
    maxW: "md",
    p: "6",
    bg: "bg",
    color: "fg",
    borderWidth: "1px",
    borderColor: "border",
    borderRadius: "lg",
    boxShadow: "lg",
  },
});

export const dialogTitle = defineRecipe({
  className: "dialogTitle",
  base: { fontWeight: "bold", fontSize: "lg" },
});

export const dialogDescription = defineRecipe({
  className: "dialogDescription",
  base: { fontSize: "sm", color: "fg.muted" },
});
