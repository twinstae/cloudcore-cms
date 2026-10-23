import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import { button } from "styled-system/recipes";

export type ButtonProps = ComponentProps<typeof Button>;
// 폼 안에서 의도치 않게 제출되지 않도록 기본은 type="button"이다.
export const Button = styled(ark.button, button, { defaultProps: { type: "button" } });
