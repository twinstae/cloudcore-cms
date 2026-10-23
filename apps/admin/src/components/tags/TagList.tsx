import type { Tag } from "@cloudcore/schema";
import { styled } from "styled-system/jsx";
import {
  tagListActions,
  tagListDescription,
  tagListHead,
  tagListItem,
  tagListList,
  tagListRoot,
} from "styled-system/recipes";
import { Badge, Button, Heading } from "../ui";

const Root = styled("section", tagListRoot);
const List = styled("ul", tagListList);
const Item = styled("li", tagListItem);
const Head = styled("div", tagListHead);
const Description = styled("p", tagListDescription);
const Actions = styled("div", tagListActions);

type TagListProps = {
  tags: readonly Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
};

export function TagList({ tags, onEdit, onDelete }: TagListProps) {
  return (
    <Root aria-label="Tag 목록">
      {tags.length === 0 ? (
        <p>아직 Tag가 없습니다</p>
      ) : (
        <List>
          {tags.map((tag) => (
            <Item key={tag.id}>
              <Head>
                <Heading as="h3" size="sm">
                  {tag.name}
                </Heading>
                <Badge asChild tone="neutral">
                  <output aria-label={`${tag.name} slug`}>{tag.slug}</output>
                </Badge>
              </Head>
              {tag.description && <Description>{tag.description}</Description>}
              <Actions>
                <Button
                  size="sm"
                  tone="ghost"
                  aria-label={`${tag.name} 수정`}
                  onClick={() => onEdit(tag)}
                >
                  수정
                </Button>
                <Button
                  size="sm"
                  tone="ghost"
                  aria-label={`${tag.name} 삭제`}
                  onClick={() => onDelete(tag)}
                >
                  삭제
                </Button>
              </Actions>
            </Item>
          ))}
        </List>
      )}
    </Root>
  );
}
