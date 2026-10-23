import { it } from "vitest";
import { assertions, given, query, runSiheom } from "../test/siheom";
import { HealthStatus } from "./HealthStatus";

it("연결되면 연결됨을 보여준다", async () => {
  await runSiheom(
    given.render(<HealthStatus connected />),
    assertions.textContent(query.status("API 상태"), "API 연결됨"),
  );
});

it("연결되지 않으면 실패를 보여준다", async () => {
  await runSiheom(
    given.render(<HealthStatus connected={false} />),
    assertions.textContent(query.status("API 상태"), "API 연결 실패"),
  );
});
