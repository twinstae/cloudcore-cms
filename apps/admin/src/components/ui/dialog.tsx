import { Dialog as ArkDialog } from "@ark-ui/react/dialog";
import { styled } from "styled-system/jsx";
import {
  dialogBackdrop,
  dialogContent,
  dialogDescription,
  dialogPositioner,
  dialogTitle,
} from "styled-system/recipes";

export const Dialog = {
  Root: ArkDialog.Root,
  Trigger: ArkDialog.Trigger,
  CloseTrigger: ArkDialog.CloseTrigger,
  Backdrop: styled(ArkDialog.Backdrop, dialogBackdrop),
  Positioner: styled(ArkDialog.Positioner, dialogPositioner),
  Content: styled(ArkDialog.Content, dialogContent),
  Title: styled(ArkDialog.Title, dialogTitle),
  Description: styled(ArkDialog.Description, dialogDescription),
};
