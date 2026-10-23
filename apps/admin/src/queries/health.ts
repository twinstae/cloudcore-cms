import { queryOptions } from "@tanstack/react-query";
import { api } from "../lib/api";

export const healthQueryOption = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const res = await api.api.health.$get();
    if (!res.ok) throw new Error(`health ${res.status}`);
    return res.json();
  },
});
