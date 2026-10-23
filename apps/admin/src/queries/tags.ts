import {
  type CreateTagInput,
  decodeTag,
  type Tag,
  TagWire,
  type UpdateTagInput,
} from "@cloudcore/schema";
import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";
import { api } from "../lib/api";

// 클라이언트도 응답을 wire 스키마로 parse한 뒤 도메인 모델로 decode한다.
const decodeOne = (body: unknown): Tag => {
  const decoded = decodeTag(body);
  if (decoded.isErr()) throw decoded.error;
  return decoded.value;
};

const decodeList = (body: unknown): Tag[] => v.parse(v.array(TagWire), body).map(decodeOne);

export const tagsQueryOption = queryOptions({
  queryKey: ["tags"],
  queryFn: async () => {
    const res = await api.api.tags.$get();
    if (!res.ok) throw new Error(`tags ${res.status}`);
    return decodeList(await res.json());
  },
});

export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  const res = await api.api.tags.$post({ json: input });
  if (!res.ok) throw new Error(`create tag ${res.status}`);
  return decodeOne(await res.json());
};

export const updateTag = async (id: Tag["id"], input: UpdateTagInput): Promise<Tag> => {
  const res = await api.api.tags[":id"].$patch({ param: { id }, json: input });
  if (!res.ok) throw new Error(`update tag ${res.status}`);
  return decodeOne(await res.json());
};

export const deleteTag = async (id: Tag["id"]): Promise<void> => {
  const res = await api.api.tags[":id"].$delete({ param: { id } });
  if (!res.ok) throw new Error(`delete tag ${res.status}`);
};
