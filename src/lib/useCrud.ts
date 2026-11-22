import { useEffect, useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { api, errMsg } from "@/lib/api"
import type { Paged } from "@/lib/types"
import { useDebounced } from "@/components/ui/kit"
import { toParams, type FilterDef, type FilterValues } from "@/components/ui/filters"

/**
 * Records already downloaded, per resource + search/filter combination, indexed by their position in the result.
 * When the page changes or the page size grows, only the positions we don't have yet are requested
 * (e.g. going from 10 to 20 per page fetches just records 11–20).
 */
type Bucket = { items: Map<number, unknown>; total: number | null; at: number }
const TTL_MS = 30_000 // downloaded records older than this are fetched again (other users may have changed them)
const cache = new Map<string, Bucket>()
const bucketOf = (key: string): Bucket => {
  let b = cache.get(key)
  if (!b || Date.now() - b.at > TTL_MS) { b = { items: new Map(), total: null, at: Date.now() }; cache.set(key, b) }
  return b
}

/** Shared list state (search, filters, paging, page size) + create/update/delete mutations for a REST resource. */
export function useCrud<T extends { _id: string }>(resource: string, opts: { enabled?: boolean } = {}) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimitState] = useState(10)
  const [search, setSearch] = useState("")
  const [filters, setFiltersState] = useState<FilterValues>({})
  const q = useDebounced(search)
  const params = toParams(filters)
  const ctx = `${resource}|${q}|${JSON.stringify(params)}`

  // Anything that invalidates this resource (saves, deletes, payments…) also drops its downloaded records.
  useEffect(
    () => qc.getQueryCache().subscribe((e) => {
      if (e.type === "updated" && e.action.type === "invalidate" && e.query.queryKey[0] === resource) {
        for (const k of [...cache.keys()]) if (k.startsWith(`${resource}|`)) cache.delete(k)
      }
    }),
    [qc, resource],
  )

  const list = useQuery({
    queryKey: [resource, { page, limit, ctx }],
    queryFn: async (): Promise<Paged<T>> => {
      const b = bucketOf(ctx)
      const start = (page - 1) * limit
      const need = () => (b.total === null ? start + limit : Math.min(start + limit, b.total))

      // Fetch each missing run of positions in a single request.
      for (let i = start; i < need(); ) {
        if (b.items.has(i)) { i++; continue }
        let j = i
        while (j < need() && !b.items.has(j)) j++
        const { data } = await api.get<Paged<T> & { skip?: number }>(`/${resource}`, { params: { offset: i, limit: j - i, search: q || undefined, ...params } })
        data.items.forEach((it, n) => b.items.set(i + n, it))
        b.total = data.total
        if (data.items.length < j - i) break // reached the end of the result
        i = j
      }
      const total = b.total ?? 0
      const items: T[] = []
      for (let i = start; i < Math.min(start + limit, total); i++) { const it = b.items.get(i); if (it) items.push(it as T) }
      return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
    },
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [resource] })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
  }

  const save = useMutation({
    mutationFn: async ({ id, body }: { id?: string; body: unknown }) =>
      id ? (await api.put(`/${resource}/${id}`, body)).data : (await api.post(`/${resource}`, body)).data,
    onSuccess: (_d, v) => { toast.success(v.id ? "Updated" : "Created"); invalidate() },
    onError: (e) => toast.error(errMsg(e)),
  })
  const remove = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/${resource}/${id}`)).data,
    onSuccess: () => { toast.success("Deleted"); invalidate() },
    onError: (e) => toast.error(errMsg(e)),
  })

  const apply = (v: FilterValues) => { setFiltersState(v); setPage(1) }
  return {
    list, page, setPage, limit, setLimit: (n: number) => { setLimitState(n); setPage(1) },
    search, setSearch: (v: string) => { setSearch(v); setPage(1) },
    filters, setFilters: apply,
    items: list.data?.items ?? [], save, remove, invalidate,
    /** props for <ListToolbar …> */
    toolbar: (placeholder: string, defs?: FilterDef[]) => ({
      search, onSearch: (v: string) => { setSearch(v); setPage(1) }, placeholder,
      filters: defs ? { defs, value: filters, onChange: apply } : undefined,
    }),
    /** props for <Pagination …> */
    pager: {
      page, limit, pages: list.data?.pages ?? 1, total: list.data?.total ?? 0,
      onPage: setPage, onLimit: (n: number) => { setLimitState(n); setPage(1) },
    },
  }
}
