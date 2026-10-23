import { Field as ArkField } from "@ark-ui/react/field";
import { styled } from "styled-system/jsx";
import { fieldError, fieldHelper, fieldLabel, fieldRoot } from "styled-system/recipes";

export const FieldRoot = styled(ArkField.Root, fieldRoot);
export const FieldLabel = styled(ArkField.Label, fieldLabel);
export const FieldHelperText = styled(ArkField.HelperText, fieldHelper);
export const FieldErrorText = styled(ArkField.ErrorText, fieldError);
