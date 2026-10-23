import { CreateTagInput, encodeTag, TagWire } from "@cloudcore/schema";
import { type Context, Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import * as v from "valibot";
import type { AppEnv } from "../types";
import { validate } from "../validation";
import { createTagStore, type TagStoreError } from "./store";

const json = (schema: v.GenericSchema) => ({ "application/json": { schema: resolver(schema) } });

// store의 실패 사유는 여기서만 HTTP로 바뀐다. 사유가 늘면 match가 컴파일을 막는다.
const errorResponse = (c: Context<AppEnv>, error: TagStoreError) =>
  error.match({
    SlugTaken: () => c.json({ error: "slug_taken" as const }, 409),
    TagDecodeError: () => c.json({ error: "tag_decode_failed" as const }, 500),
  });

export const tagRoutes = new Hono<AppEnv>()
  .get(
    "/",
    describeRoute({
      tags: ["tags"],
      responses: {
        200: { description: "Tag 목록(이름순)", content: json(v.array(TagWire)) },
        500: { description: "저장된 Tag를 해석하지 못함" },
      },
    }),
    async (c) => {
      const result = await createTagStore(c.var.db).list();
      if (result.isErr()) return errorResponse(c, result.error);
      return c.json(result.value.map(encodeTag), 200);
    },
  )
  .post(
    "/",
    describeRoute({
      tags: ["tags"],
      responses: {
        201: { description: "생성됨", content: json(TagWire) },
        400: { description: "입력이 올바르지 않음" },
        409: { description: "slug가 이미 있음" },
      },
    }),
    validate("json", CreateTagInput),
    async (c) => {
      const result = await createTagStore(c.var.db).create(c.req.valid("json"));
      if (result.isErr()) return errorResponse(c, result.error);
      return c.json(encodeTag(result.value), 201);
    },
  );
