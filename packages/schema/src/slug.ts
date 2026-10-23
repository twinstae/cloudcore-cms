import * as v from "valibot";

export const Slug = v.pipe(
  v.string(),
  v.minLength(1, "slug를 입력하세요"),
  v.maxLength(200, "slug는 200자까지 쓸 수 있습니다"),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug는 소문자, 숫자, 하이픈만 쓸 수 있습니다"),
  v.brand("Slug"),
);
export type Slug = v.InferOutput<typeof Slug>;
