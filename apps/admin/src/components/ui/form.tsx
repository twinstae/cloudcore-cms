import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import { form } from "styled-system/recipes";

export type FormProps = ComponentProps<typeof Form>;
export const Form = styled(ark.form, form);
