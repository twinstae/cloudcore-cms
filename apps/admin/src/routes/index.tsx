import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HealthStatus } from "../components/HealthStatus";
import { Heading, Page } from "../components/ui";
import { healthQueryOption } from "../queries/health";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(healthQueryOption),
  component: HomePage,
  errorComponent: () => <HomeLayout connected={false} />,
});

function HomePage() {
  const { data } = useSuspenseQuery(healthQueryOption);
  return <HomeLayout connected={data.ok} />;
}

function HomeLayout({ connected }: { connected: boolean }) {
  return (
    <Page>
      <Heading>Cloudcore</Heading>
      <HealthStatus connected={connected} />
    </Page>
  );
}
