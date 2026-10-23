import type { Tag } from "@cloudcore/schema";
import {
  Badge,
  Button,
  Heading,
  TagListActions,
  TagListDescription,
  TagListHead,
  TagListItem,
  TagListList,
  TagListRoot,
} from "../ui";

type TagListProps = {
  tags: readonly Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
};

export function TagList({ tags, onEdit, onDelete }: TagListProps) {
  return (
    <TagListRoot aria-label="Tag 목록">
      {tags.length === 0 ? (
        <p>아직 Tag가 없습니다</p>
      ) : (
        <TagListList>
          {tags.map((tag) => (
            <TagListItem key={tag.id}>
              <TagListHead>
                <Heading as="h3" size="sm">
                  {tag.name}
                </Heading>
                <Badge asChild tone="neutral">
                  <output aria-label={`${tag.name} slug`}>{tag.slug}</output>
                </Badge>
              </TagListHead>
              {tag.description && <TagListDescription>{tag.description}</TagListDescription>}
              <TagListActions>
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
              </TagListActions>
            </TagListItem>
          ))}
        </TagListList>
      )}
    </TagListRoot>
  );
}
