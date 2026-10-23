import { ark } from "@ark-ui/react/factory";
import type { ComponentProps } from "react";
import { styled } from "styled-system/jsx";
import {
  tagListActions,
  tagListDescription,
  tagListHead,
  tagListItem,
  tagListList,
  tagListRoot,
} from "styled-system/recipes";

export type TagListRootProps = ComponentProps<typeof TagListRoot>;
export const TagListRoot = styled(ark.section, tagListRoot);
export const TagListList = styled(ark.ul, tagListList);
export const TagListItem = styled(ark.li, tagListItem);
export const TagListHead = styled(ark.div, tagListHead);
export const TagListDescription = styled(ark.p, tagListDescription);
export const TagListActions = styled(ark.div, tagListActions);
