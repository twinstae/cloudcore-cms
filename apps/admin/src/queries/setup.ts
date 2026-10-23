import { queryOptions } from "@tanstack/react-query";
import { api } from "../lib/api";

export const setupQueryOption = queryOptions({
  queryKey: ["setup"],
  queryFn: async () => {
    const res = await api.api.setup.$get();
    if (!res.ok) throw new Error(`setup ${res.status}`);
    return res.json();
  },
});

export type CreateOwnerInput = { name: string; email: string; password: string };

export const createOwner = async (input: CreateOwnerInput): Promise<void> => {
  const res = await api.api.setup.$post({ json: input });
  if (!res.ok) throw new Error(`setup ${res.status}`);
};
