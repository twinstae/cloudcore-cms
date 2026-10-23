import { Badge } from "./ui";

export function HealthStatus({ connected }: { connected: boolean }) {
  return (
    <Badge asChild tone={connected ? "success" : "danger"}>
      <output aria-label="API 상태">{connected ? "API 연결됨" : "API 연결 실패"}</output>
    </Badge>
  );
}
