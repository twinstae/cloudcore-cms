import type { CreateTagInput, Tag } from "@cloudcore/schema";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TagForm } from "../components/tags/TagForm";
import { TagList } from "../components/tags/TagList";
import { Heading, Page } from "../components/ui";
import { createTag, deleteTag, tagsQueryOption, updateTag } from "../queries/tags";

// 편집 대상은 라우터 상태(URL)로 다룬다. 다이얼로그가 붙어도 이 계약은 그대로다.
type TagsSearch = { edit?: string | undefined };

export const Route = createFileRoute("/tags")({
  validateSearch: (search: Record<string, unknown>): TagsSearch => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tagsQueryOption),
  component: TagsPage,
  errorComponent: () => (
    <Page>
      <Heading>Tags</Heading>
      <p>Tag를 불러오지 못했습니다.</p>
    </Page>
  ),
});

function TagsPage() {
  const { data: tags } = useSuspenseQuery(tagsQueryOption);
  const { edit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const editing = tags.find((tag) => tag.id === edit);

  const refresh = () => queryClient.invalidateQueries({ queryKey: tagsQueryOption.queryKey });
  const closeEditor = () => navigate({ to: "/tags", search: {} });

  const handleCreate = async (values: CreateTagInput) => {
    await createTag(values);
    await refresh();
  };

  const handleUpdate = async (tag: Tag, values: CreateTagInput) => {
    await updateTag(tag.id, values);
    await refresh();
    await closeEditor();
  };

  const handleDelete = async (tag: Tag) => {
    await deleteTag(tag.id);
    await refresh();
    if (editing?.id === tag.id) await closeEditor();
  };

  return (
    <Page>
      <Heading>Tags</Heading>
      {editing ? (
        <TagForm
          key={editing.id}
          submitLabel="저장"
          defaultValues={{
            name: editing.name,
            slug: editing.slug,
            description: editing.description,
          }}
          onSubmit={(values) => handleUpdate(editing, values)}
          onCancel={closeEditor}
        />
      ) : (
        <TagForm submitLabel="추가" onSubmit={handleCreate} />
      )}
      <TagList
        tags={tags}
        onEdit={(tag) => navigate({ to: "/tags", search: { edit: tag.id } })}
        onDelete={handleDelete}
      />
    </Page>
  );
}
