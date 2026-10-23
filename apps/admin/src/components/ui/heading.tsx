import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import { heading } from "styled-system/recipes";

export type HeadingProps = ComponentProps<typeof Heading>;
export const Heading = styled(ark.h1, heading);
