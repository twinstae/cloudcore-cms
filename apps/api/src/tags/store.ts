import {
  type CreateTagInput,
  decodeTag,
  encodeTag,
  type Tag,
  TagDecodeError,
  type TagWireInput,
  toIsoMillis,
} from "@cloudcore/schema";
import { Result, TaggedError } from "better-result";
import { asc } from "drizzle-orm";
import { Temporal } from "temporal-polyfill";
import { ulid } from "ulid";
import { type Db, isUniqueViolation } from "../db";
import { tags } from "../db/schema";

/** slug가 이미 쓰이고 있다. 예상된 실패라 예외가 아니라 Result로 돌려준다. */
export class SlugTaken extends TaggedError("SlugTaken")<{ slug: string; message: string }> {}

export type TagStoreError = SlugTaken | TagDecodeError;

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
  };
}
