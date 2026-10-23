import * as v from "valibot";

export const Slug = v.pipe(
  v.string(),
  v.minLength(1),
  v.maxLength(200),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug는 소문자, 숫자, 하이픈만 쓸 수 있습니다"),
  v.brand("Slug"),
);
export type Slug = v.InferOutput<typeof Slug>;
