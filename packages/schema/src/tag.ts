import { Result, TaggedError } from "better-result";
import { Temporal } from "temporal-polyfill";
import * as v from "valibot";
import { IsoInstant, toIsoMillis } from "./instant";
import { Slug } from "./slug";

export const TagId = v.pipe(v.string(), v.ulid(), v.brand("TagId"));
export type TagId = v.InferOutput<typeof TagId>;

// 입력과 DB row가 같은 제약을 쓴다. row를 decode할 때도 이름이 비었는지까지 확인된다.
export const TagName = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1, "이름을 입력하세요"),
  v.maxLength(100),
);
export type TagName = v.InferOutput<typeof TagName>;

export const TagDescription = v.pipe(
  v.string(),
  v.maxLength(500, "설명은 500자까지 쓸 수 있습니다"),
);

/**
 * 외부 세계(HTTP JSON, DB row)의 모양. 시각은 밀리초 3자리 ISO 문자열이고
 * 요청·응답 두 곳에서 쓰이므로 transform이 없는 wire 스키마여야 한다(06).
 */
export const TagWire = v.pipe(
  v.object({
    id: TagId,
    name: TagName,
    slug: Slug,
    description: TagDescription,
    createdAt: IsoInstant,
    updatedAt: IsoInstant,
  }),
  v.metadata({ ref: "Tag" }),
);
export type TagWire = v.InferOutput<typeof TagWire>;
/** 밖에서 들어오는(아직 decode하지 않은) 모양. branded type이 없다. */
export type TagWireInput = v.InferInput<typeof TagWire>;

/** 도메인 모델. 안쪽에서는 문자열 시각을 쓰지 않는다. */
export type Tag = Omit<TagWire, "createdAt" | "updatedAt"> & {
  createdAt: Temporal.Instant;
  updatedAt: Temporal.Instant;
};

export type TagIssue = { message: string; path: readonly (string | number)[] };

export class TagDecodeError extends TaggedError("TagDecodeError")<{
  message: string;
  issues: readonly TagIssue[];
}> {}

const toPathKey = (item: unknown): string | number => {
  if (typeof item === "number" || typeof item === "string") return item;
  if (typeof item === "object" && item !== null && "key" in item) {
    const key: unknown = (item as { key: unknown }).key;
    return typeof key === "number" ? key : String(key);
  }
  return String(item);
};

/** 외부 세계 → 도메인 모델. 모든 경계에서 이 함수를 지난다. */
export const decodeTag = (input: unknown): Result<Tag, TagDecodeError> => {
  const parsed = v.safeParse(TagWire, input);
  if (!parsed.success) {
    return Result.err(
      new TagDecodeError({
        message: "Tag를 해석하지 못했습니다",
        issues: parsed.issues.map(({ message, path }) => ({
          message,
          path: (path ?? []).map(toPathKey),
        })),
      }),
    );
  }

  const { createdAt, updatedAt, ...rest } = parsed.output;
  return Result.ok({
    ...rest,
    createdAt: Temporal.Instant.from(createdAt),
    updatedAt: Temporal.Instant.from(updatedAt),
  });
};

/** 도메인 모델 → 외부 세계. 응답과 DB 쓰기는 이 함수의 결과만 쓴다. */
export const encodeTag = (tag: Tag): TagWire => ({
  ...tag,
  createdAt: toIsoMillis(tag.createdAt),
  updatedAt: toIsoMillis(tag.updatedAt),
});

export const CreateTagInput = v.object({
  name: TagName,
  slug: Slug,
  description: v.optional(TagDescription, ""),
});
export type CreateTagInput = v.InferOutput<typeof CreateTagInput>;

export const UpdateTagInput = v.pipe(
  v.object({
    name: v.optional(TagName),
    slug: v.optional(Slug),
    description: v.optional(TagDescription),
  }),
  v.check((input) => Object.keys(input).length > 0, "바꿀 값을 하나는 보내야 합니다"),
);
export type UpdateTagInput = v.InferOutput<typeof UpdateTagInput>;
