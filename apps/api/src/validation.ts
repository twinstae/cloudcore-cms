import type { Context } from "hono";
import { validator } from "hono-openapi";
// 선언 파일에서 validator의 타입을 이름으로 쓸 수 있게 직접 import한다(TS2883).
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { GenericSchema } from "valibot";

type Target = Parameters<typeof validator>[0];

/**
 * 입력 검증. 실패하면 400 `{ error: "invalid_input", issues }`.
 * 기본 hook은 입력값을 그대로 되돌려 주므로(06 조사) 쓰지 않는다.
 */
export const validate = <T extends Target, S extends GenericSchema & StandardSchemaV1>(
  target: T,
  schema: S,
) =>
  validator(target, schema, (result, c: Context) => {
    if (!result.success) {
      const issues = result.error.map(({ message, path }) => ({
        message,
        path: path?.map((p) => (typeof p === "object" ? p.key : p)),
      }));
      return c.json({ error: "invalid_input" as const, issues }, 400);
    }
  });
