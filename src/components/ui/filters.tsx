import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Funnel, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label, Select } from "@/components/ui/form"
import { Badge, SearchInput } from "@/components/ui/kit"
import { cn } from "@/lib/utils"

export type Opt = { value: string; label: string }

/**
 * One filter per table column. Values live in a flat Record<string,string>:
 *  select / search / text  -> values[key]
 *  dateRange               -> values[`${key}From`], values[`${key}To`]
 *  numberRange             -> values[`${key}Min`],  values[`${key}Max`]
 *  search (entity picker)  -> also values[`_label_${key}`] so the chosen name can be shown again
 */
export type FilterDef =
  | { key: string; label: string; type: "select"; options: Opt[]; allLabel?: string }
  | { key: string; label: string; type: "search"; options?: Opt[]; load?: (q: string) => Promise<Opt[]>; placeholder?: string }
  | { key: string; label: string; type: "text"; placeholder?: string }
  | { key: string; label: string; type: "dateRange" }
  | { key: string; label: string; type: "numberRange"; prefix?: string }

export type FilterValues = Record<string, string>

const LABEL = "_label_"
const keysOf = (d: FilterDef) =>
  d.type === "dateRange" ? [`${d.key}From`, `${d.key}To`] : d.type === "numberRange" ? [`${d.key}Min`, `${d.key}Max`] : d.type === "search" ? [d.key, LABEL + d.key] : [d.key]
const isActive = (d: FilterDef, v: FilterValues) => keysOf(d).filter((k) => !k.startsWith(LABEL)).some((k) => v[k])

/** Removes UI-only and empty keys before sending filters to the API. */
export const toParams = (v: FilterValues) => Object.fromEntries(Object.entries(v).filter(([k, x]) => x !== "" && x !== "all" && !k.startsWith(LABEL)))

function rangeError(d: FilterDef, v: FilterValues) {
  if (d.type === "dateRange" && v[`${d.key}From`] && v[`${d.key}To`] && v[`${d.key}From`] > v[`${d.key}To`]) return "“From” must be before “To”"
  if (d.type === "numberRange") {
    const a = v[`${d.key}Min`], b = v[`${d.key}Max`]
    if (a && Number(a) < 0) return "Amounts cannot be negative"
    if (b && Number(b) < 0) return "Amounts cannot be negative"
    if (a !== undefined && b !== undefined && a !== "" && b !== "" && Number(a) > Number(b)) return "Minimum must not exceed maximum"
  }
  return undefined
}

/** Select box with a type-to-filter list. Options are static (`options`) or fetched as you type (`load`). */
export function SearchableSelect({
  value, label, onChange, options, load, placeholder = "Search…",
}: { value: string; label: string; onChange: (value: string, label: string) => void; options?: Opt[]; load?: (q: string) => Promise<Opt[]>; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [remote, setRemote] = useState<Opt[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !load) return
    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const r = await load(q)
        if (!cancelled) setRemote(r)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [q, open, load])

  const shown = load ? remote : (options ?? []).filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div>
      <button
        type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm hover:bg-muted/40"
      >
        <span className={cn("truncate", !value && "text-muted-foreground/70")}>{value ? label : "All"}</span>
        <span className="flex items-center gap-1">
          {value && <span role="button" aria-label="Clear" tabIndex={0} className="rounded p-0.5 hover:bg-muted" onClick={(e) => { e.stopPropagation(); onChange("", "") }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange("", "") } }}><X className="size-3.5" /></span>}
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
      </button>
      {open && (
        <div className="mt-1 rounded-lg border bg-background p-1.5 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-muted-foreground" />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-8 pl-7" />
          </div>
          <ul className="mt-1.5 max-h-44 overflow-y-auto" role="listbox">
            {loading && <li className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</li>}
            {!loading && !shown.length && <li className="px-2 py-1.5 text-xs text-muted-foreground">No matches</li>}
            {shown.map((o) => (
              <li key={o.value}>
                <button
                  type="button" role="option" aria-selected={o.value === value}
                  onClick={() => { onChange(o.value, o.label); setOpen(false); setQ("") }}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FilterField({ def, v, set }: { def: FilterDef; v: FilterValues; set: (patch: FilterValues) => void }) {
  const err = rangeError(def, v)
  return (
    <div>
      <Label className="mb-1 text-xs">{def.label}</Label>
      {def.type === "select" && (
        <Select value={v[def.key] ?? ""} onChange={(e) => set({ [def.key]: e.target.value })} className="h-9">
          <option value="">{def.allLabel ?? "All"}</option>
          {def.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      )}
      {def.type === "search" && (
        <SearchableSelect
          value={v[def.key] ?? ""} label={v[LABEL + def.key] ?? ""} options={def.options} load={def.load} placeholder={def.placeholder}
          onChange={(val, lab) => set({ [def.key]: val, [LABEL + def.key]: lab })}
        />
      )}
      {def.type === "text" && <Input value={v[def.key] ?? ""} onChange={(e) => set({ [def.key]: e.target.value })} placeholder={def.placeholder} className="h-9" />}
      {def.type === "dateRange" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" aria-label={`${def.label} from`} value={v[`${def.key}From`] ?? ""} max={v[`${def.key}To`] || undefined} aria-invalid={err ? true : undefined} onChange={(e) => set({ [`${def.key}From`]: e.target.value })} className="h-9" />
          <Input type="date" aria-label={`${def.label} to`} value={v[`${def.key}To`] ?? ""} min={v[`${def.key}From`] || undefined} aria-invalid={err ? true : undefined} onChange={(e) => set({ [`${def.key}To`]: e.target.value })} className="h-9" />
        </div>
      )}
      {def.type === "numberRange" && (
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min={0} inputMode="numeric" placeholder={`Min${def.prefix ? ` (${def.prefix})` : ""}`} aria-label={`${def.label} minimum`} value={v[`${def.key}Min`] ?? ""} aria-invalid={err ? true : undefined} onChange={(e) => set({ [`${def.key}Min`]: e.target.value })} className="h-9" />
          <Input type="number" min={0} inputMode="numeric" placeholder={`Max${def.prefix ? ` (${def.prefix})` : ""}`} aria-label={`${def.label} maximum`} value={v[`${def.key}Max`] ?? ""} aria-invalid={err ? true : undefined} onChange={(e) => set({ [`${def.key}Max`]: e.target.value })} className="h-9" />
        </div>
      )}
      {err && <p role="alert" className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  )
}

/** A single "Filter" button that opens a dropdown containing every filter of the list. */
export function FilterButton({ defs, value, onChange }: { defs: FilterDef[]; value: FilterValues; onChange: (v: FilterValues) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<FilterValues>(value)
  const wrap = useRef<HTMLDivElement>(null)
  const active = defs.filter((d) => isActive(d, value)).length
  const invalid = defs.some((d) => rangeError(d, draft))

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", down)
    document.addEventListener("keydown", key)
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key) }
  }, [open])

  const toggle = () => { if (!open) setDraft(value); setOpen((o) => !o) }
  const apply = () => { onChange(draft); setOpen(false) }
  const clear = () => { setDraft({}); onChange({}); setOpen(false) }

  return (
    <div ref={wrap} className="relative shrink-0">
      <Button type="button" variant="outline" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" className="h-9">
        <Funnel /> Filter
        {active > 0 && <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{active}</span>}
      </Button>
      {open && (
        <div role="dialog" aria-label="Filters" className="absolute right-0 top-full z-30 mt-2 w-[min(26rem,calc(100vw-2rem))] rounded-xl border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Filters</p>
            <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
          </div>
          <div className="max-h-[min(60vh,32rem)] space-y-3.5 overflow-y-auto px-4 py-3.5">
            {defs.map((d) => <FilterField key={d.key} def={d} v={draft} set={(patch) => setDraft((x) => ({ ...x, ...patch }))} />)}
          </div>
          <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
            <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!active && !Object.keys(draft).length}>Reset</Button>
            <Button type="button" size="sm" onClick={apply} disabled={invalid}>Apply filters</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Chips for the applied filters, each removable. */
export function ActiveFilters({ defs, value, onChange }: { defs: FilterDef[]; value: FilterValues; onChange: (v: FilterValues) => void }) {
  const active = defs.filter((d) => isActive(d, value))
  if (!active.length) return null
  const text = (d: FilterDef) => {
    if (d.type === "select") return d.options.find((o) => o.value === value[d.key])?.label ?? value[d.key]
    if (d.type === "search") return value[LABEL + d.key] || value[d.key]
    if (d.type === "dateRange") return `${value[`${d.key}From`] || "…"} → ${value[`${d.key}To`] || "…"}`
    if (d.type === "numberRange") return `${value[`${d.key}Min`] || "0"} – ${value[`${d.key}Max`] || "∞"}`
    return value[d.key]
  }
  const remove = (d: FilterDef) => { const n = { ...value }; keysOf(d).forEach((k) => delete n[k]); onChange(n) }
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2">
      {active.map((d) => (
        <Badge key={d.key} tone="blue" className="gap-1 pr-1">
          {d.label}: {text(d)}
          <button type="button" aria-label={`Remove ${d.label} filter`} onClick={() => remove(d)} className="rounded-full p-0.5 hover:bg-blue-200"><X className="size-3" /></button>
        </Badge>
      ))}
      <button type="button" onClick={() => onChange({})} className="ml-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">Clear all</button>
    </div>
  )
}

/** The standard top row of every list: search on the left (stretches), Filter button on the right. */
export function ListToolbar({
  search, onSearch, placeholder, filters,
}: { search: string; onSearch: (v: string) => void; placeholder: string; filters?: { defs: FilterDef[]; value: FilterValues; onChange: (v: FilterValues) => void } }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b p-4">
        <SearchInput value={search} onChange={onSearch} placeholder={placeholder} />
        {filters && <FilterButton {...filters} />}
      </div>
      {filters && <ActiveFilters {...filters} />}
    </>
  )
}
