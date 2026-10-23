import { CreateTagInput, encodeTag, TagId, TagWire, UpdateTagInput } from "@cloudcore/schema";
import { type Context, Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import * as v from "valibot";
import { requireOwner, requireUser } from "../auth/middleware";
import type { AppEnv } from "../types";
import { validate } from "../validation";
import { createTagStore, type TagStoreError } from "./store";

const json = (schema: v.GenericSchema) => ({ "application/json": { schema: resolver(schema) } });
const tagParam = v.object({ id: TagId });

// store의 실패 사유는 여기서만 HTTP로 바뀐다. 사유가 늘면 match가 컴파일을 막는다.
const errorResponse = (c: Context<AppEnv>, error: TagStoreError) =>
  error.match({
    SlugTaken: () => c.json({ error: "slug_taken" as const }, 409),
    TagNotFound: () => c.json({ error: "tag_not_found" as const }, 404),
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
        401: { description: "로그인 필요" },
        409: { description: "slug가 이미 있음" },
      },
    }),
    requireUser,
    validate("json", CreateTagInput),
    async (c) => {
      const result = await createTagStore(c.var.db).create(c.req.valid("json"));
      if (result.isErr()) return errorResponse(c, result.error);
      return c.json(encodeTag(result.value), 201);
    },
  )
  .patch(
    "/:id",
    describeRoute({
      tags: ["tags"],
      responses: {
        200: { description: "수정됨", content: json(TagWire) },
        400: { description: "입력이 올바르지 않음" },
        401: { description: "로그인 필요" },
        403: { description: "Owner만 가능" },
        404: { description: "Tag가 없음" },
        409: { description: "slug가 이미 있음" },
      },
    }),
    requireUser,
    requireOwner,
    validate("param", tagParam),
    validate("json", UpdateTagInput),
    async (c) => {
      const result = await createTagStore(c.var.db).update(
        c.req.valid("param").id,
        c.req.valid("json"),
      );
      if (result.isErr()) return errorResponse(c, result.error);
      return c.json(encodeTag(result.value), 200);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["tags"],
      responses: {
        204: { description: "삭제됨" },
        400: { description: "id가 ULID가 아님" },
        401: { description: "로그인 필요" },
        403: { description: "Owner만 가능" },
        404: { description: "Tag가 없음" },
      },
    }),
    requireUser,
    requireOwner,
    validate("param", tagParam),
    async (c) => {
      const result = await createTagStore(c.var.db).remove(c.req.valid("param").id);
      if (result.isErr()) return errorResponse(c, result.error);
      return c.body(null, 204);
    },
  );
