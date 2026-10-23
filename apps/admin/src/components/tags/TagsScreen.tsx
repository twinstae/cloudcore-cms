import type { CreateTagInput, Tag } from "@cloudcore/schema";
import { useState } from "react";
import { ThemeToggle } from "../ThemeToggle";
import { Button, Dialog, Heading, HStack, Page } from "../ui";
import { TagForm } from "./TagForm";
import { TagList } from "./TagList";

type TagsScreenProps = {
  tags: readonly Tag[];
  /** 편집 중인 Tag. URL(?edit=)이 이 값을 정한다. */
  editingId?: string | undefined;
  onEditingChange: (id: string | undefined) => void;
  onCreate: (values: CreateTagInput) => Promise<void>;
  onUpdate: (tag: Tag, values: CreateTagInput) => Promise<void>;
  onDelete: (tag: Tag) => void | Promise<void>;
};

export function TagsScreen({
  tags,
  editingId,
  onEditingChange,
  onCreate,
  onUpdate,
  onDelete,
}: TagsScreenProps) {
  const [creating, setCreating] = useState(false);
  const editing = tags.find((tag) => tag.id === editingId);

  const handleCreate = async (values: CreateTagInput) => {
    await onCreate(values);
    setCreating(false);
  };

  const handleUpdate = async (values: CreateTagInput) => {
    if (!editing) return;
    await onUpdate(editing, values);
  };

  return (
    <Page>
      <HStack justify="between">
        <Heading>Tags</Heading>
        <HStack gap="2">
          <ThemeToggle />
          <Button tone="primary" onClick={() => setCreating(true)}>
            새 Tag
          </Button>
        </HStack>
      </HStack>

      <TagList
        tags={tags}
        onEdit={(tag) => onEditingChange(tag.id)}
        onDelete={(tag) => void onDelete(tag)}
      />

      <Dialog.Root open={creating} onOpenChange={({ open }) => setCreating(open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Title>새 Tag</Dialog.Title>
            <Dialog.Description>이름과 slug를 입력하면 목록에 바로 추가됩니다.</Dialog.Description>
            <TagForm
              submitLabel="추가"
              onSubmit={handleCreate}
              onCancel={() => setCreating(false)}
            />
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(editing)}
        onOpenChange={({ open }) => {
          if (!open) onEditingChange(undefined);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Title>Tag 수정</Dialog.Title>
            {editing && (
              <TagForm
                key={editing.id}
                submitLabel="저장"
                defaultValues={{
                  name: editing.name,
                  slug: editing.slug,
                  description: editing.description,
                }}
                onSubmit={handleUpdate}
                onCancel={() => onEditingChange(undefined)}
              />
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Page>
  );
}
