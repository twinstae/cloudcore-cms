import {
  type CreateTagInput,
  decodeTag,
  encodeTag,
  type Tag,
  TagDecodeError,
  TagId,
  type TagWireInput,
  toIsoMillis,
  type UpdateTagInput,
} from "@cloudcore/schema";
import { Result, TaggedError } from "better-result";
import { asc, eq } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import { ulid } from "ulid";
import { type Db, isUniqueViolation } from "../db";
import { tags } from "../db/schema";

/** slug가 이미 쓰이고 있다. 예상된 실패라 예외가 아니라 Result로 돌려준다. */
export class SlugTaken extends TaggedError("SlugTaken")<{
  slug: string | null;
  message: string;
}> {}

export class TagNotFound extends TaggedError("TagNotFound")<{ id: TagId; message: string }> {}

export type TagStoreError = SlugTaken | TagNotFound | TagDecodeError;

export function createTagStore(db: Db) {
  return {
    async list(): Promise<Result<Tag[], TagDecodeError>> {
      const rows = await db.select().from(tags).orderBy(asc(tags.name));

      const decoded: Tag[] = [];
      for (const row of rows) {
        const tag = decodeTag(row);
        if (tag.isErr()) return Result.err(tag.error);
        decoded.push(tag.value);
      }
      return Result.ok(decoded);
    },

    async create(input: CreateTagInput): Promise<Result<Tag, TagStoreError>> {
      const now = toIsoMillis(Temporal.Now.instant());
      const draft: TagWireInput = { id: ulid(), ...input, createdAt: now, updatedAt: now };

      // 새로 만든 값도 같은 decode를 지나야 규칙(ULID, 이름 제약)이 한 곳에만 있다.
      const tag = decodeTag(draft);
      if (tag.isErr()) return Result.err(tag.error);

      try {
        await db.insert(tags).values(encodeTag(tag.value));
        return Result.ok(tag.value);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Result.err(new SlugTaken({ slug: input.slug, message: "이미 쓰는 slug입니다" }));
        }
        throw error;
      }
    },

    async update(id: TagId, input: UpdateTagInput): Promise<Result<Tag, TagStoreError>> {
      const updatedAt = toIsoMillis(Temporal.Now.instant());

      try {
        // row를 그대로 돌려받아 decode한다. UPDATE도 경계라서 우회하지 않는다.
        const [row] = await db
          .update(tags)
          .set({ ...input, updatedAt })
          .where(eq(tags.id, id))
          .returning();

        if (row === undefined)
          return Result.err(new TagNotFound({ id, message: "Tag가 없습니다" }));
        return decodeTag(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          return Result.err(
            new SlugTaken({ slug: input.slug ?? null, message: "이미 쓰는 slug입니다" }),
          );
        }
        throw error;
      }
    },

    async remove(id: TagId): Promise<Result<void, TagNotFound>> {
      const deleted = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });

      if (deleted.length === 0)
        return Result.err(new TagNotFound({ id, message: "Tag가 없습니다" }));
      return Result.ok(undefined);
    },
  };
}
