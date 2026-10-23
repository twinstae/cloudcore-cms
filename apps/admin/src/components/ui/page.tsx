import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import { page } from "styled-system/recipes";

export type PageProps = ComponentProps<typeof Page>;
export const Page = styled(ark.main, page);
