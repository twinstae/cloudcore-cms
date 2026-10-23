import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import { row } from "styled-system/recipes";

export type HStackProps = ComponentProps<typeof HStack>;
export const HStack = styled(ark.div, row);
