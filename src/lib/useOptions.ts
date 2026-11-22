import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Opt } from "@/components/ui/filters"
import type { Paged } from "@/lib/types"

/** Distinct values for filter dropdowns, from GET /<resource>/options — e.g. { courses: string[] }. */
export function useOptions(resource: string, enabled = true) {
  const q = useQuery({
    queryKey: [resource, "options"],
    queryFn: async () => (await api.get<Record<string, string[]>>(`/${resource}/options`)).data,
    enabled,
    staleTime: 30_000,
  })
  return (name: string): Opt[] => (q.data?.[name] ?? []).map((v) => ({ value: v, label: v }))
}

/** Async loader for "pick one record" filters: searches the list endpoint as you type. */
export const entityLoader = <T extends { _id: string }>(path: string, label: (r: T) => string) =>
  async (q: string): Promise<Opt[]> => {
    const { data } = await api.get<Paged<T>>(`/${path}`, { params: { search: q || undefined, limit: 20 } })
    return data.items.map((r) => ({ value: r._id, label: label(r) }))
  }
