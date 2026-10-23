import { decodeTag, type Tag } from "@cloudcore/schema";

type TagOverrides = {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

const DEFAULTS: TagOverrides = {
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  name: "회고",
  slug: "retro",
  description: "한 주를 돌아본다",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

/** 테스트와 story가 같은 방식으로 도메인 Tag를 만든다. */
export const makeTag = (overrides: Partial<TagOverrides> = {}): Tag => {
  const decoded = decodeTag({ ...DEFAULTS, ...overrides });
  if (decoded.isErr()) throw decoded.error;
  return decoded.value;
};

export const sampleTags: Tag[] = [
  makeTag(),
  makeTag({
    id: "01ARZ3NDEKTSV4RRFFQ69G5FAW",
    name: "개발",
    slug: "dev",
    description: "코드 이야기",
  }),
];
