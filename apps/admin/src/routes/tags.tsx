import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { TagsScreen } from "../components/tags/TagsScreen";
import { Heading, Page } from "../components/ui";
import { createTag, deleteTag, tagsQueryOption, updateTag } from "../queries/tags";

// 편집 대상은 라우터 상태(URL)로 다룬다. 다이얼로그가 붙어도 이 계약은 그대로다.
type TagsSearch = { edit?: string | undefined };

export const Route = createFileRoute("/tags")({
  validateSearch: (search: Record<string, unknown>): TagsSearch => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tagsQueryOption),
  component: TagsRoute,
  errorComponent: () => (
    <Page>
      <Heading>Tags</Heading>
      <p>Tag를 불러오지 못했습니다.</p>
    </Page>
  ),
});

function TagsRoute() {
  const { data: tags } = useSuspenseQuery(tagsQueryOption);
  const { edit } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const refresh = () => queryClient.invalidateQueries({ queryKey: tagsQueryOption.queryKey });
  const goTo = (id: string | undefined) =>
    void navigate({ to: "/tags", search: id ? { edit: id } : {} });

  return (
    <TagsScreen
      tags={tags}
      editingId={edit}
      onEditingChange={goTo}
      onCreate={async (values) => {
        await createTag(values);
        await refresh();
      }}
      onUpdate={async (tag, values) => {
        await updateTag(tag.id, values);
        await refresh();
        goTo(undefined);
      }}
      onDelete={async (tag) => {
        await deleteTag(tag.id);
        await refresh();
        if (edit === tag.id) goTo(undefined);
      }}
    />
  );
}
