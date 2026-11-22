import { useContext } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react"
import { ValidationContext } from "@/lib/contentValidation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/form"

export type TableValue = { columns: { key: string; label: string }[]; rows: Record<string, string>[] }

const newKey = () => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

/** Editable grid: add/remove/reorder rows, add/remove/rename columns. */
export function TableField({ value, onChange, path }: { value: TableValue; onChange: (v: TableValue) => void; path: string }) {
  const ctx = useContext(ValidationContext)
  const colErr = (i: number) => { const k = `${path}.columns.${i}.label`; return ctx.show || ctx.touched.has(k) ? ctx.errors[k] : undefined }
  const v: TableValue = { columns: value?.columns ?? [], rows: value?.rows ?? [] }
  const set = (patch: Partial<TableValue>) => onChange({ ...v, ...patch })

  const addColumn = () => {
    const key = newKey()
    set({ columns: [...v.columns, { key, label: `Column ${v.columns.length + 1}` }], rows: v.rows.map((r) => ({ ...r, [key]: "" })) })
  }
  const removeColumn = (key: string) =>
    set({
      columns: v.columns.filter((c) => c.key !== key),
      rows: v.rows.map(({ [key]: _drop, ...rest }) => rest),
    })
  const addRow = () => set({ rows: [...v.rows, Object.fromEntries(v.columns.map((c) => [c.key, ""]))] })
  const moveRow = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= v.rows.length) return
    const rows = [...v.rows]
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
    set({ rows })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow} disabled={!v.columns.length}><Plus /> Row</Button>
        <Button type="button" size="sm" variant="outline" onClick={addColumn}><Plus /> Column</Button>
        <span className="self-center text-xs text-muted-foreground">{v.rows.length} rows · {v.columns.length} columns</span>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="w-10 px-2 py-2 text-center text-xs font-medium text-muted-foreground">#</th>
              {v.columns.map((c, ci) => (
                <th key={c.key} className="min-w-44 border-l p-1.5">
                  <div className="flex items-center gap-1">
                    <Input
                      value={c.label} aria-label="Column title" aria-invalid={colErr(ci) ? true : undefined} title={colErr(ci)} className="h-8 font-semibold"
                      onChange={(e) => set({ columns: v.columns.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)) })}
                    />
                    <button type="button" title="Delete column" aria-label={`Delete column ${c.label}`} onClick={() => removeColumn(c.key)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-24" />
            </tr>
          </thead>
          <tbody>
            {v.rows.map((row, i) => (
              <tr key={i} className="border-t">
                <td className="px-2 text-center text-xs text-muted-foreground">{i + 1}</td>
                {v.columns.map((c) => (
                  <td key={c.key} className="border-l p-1">
                    <Input
                      value={row[c.key] ?? ""} aria-label={c.label} className="h-8"
                      onChange={(e) => set({ rows: v.rows.map((r, j) => (j === i ? { ...r, [c.key]: e.target.value } : r)) })}
                    />
                  </td>
                ))}
                <td className="border-l px-1">
                  <div className="flex">
                    <button type="button" aria-label="Move up" onClick={() => moveRow(i, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ArrowUp className="size-4" /></button>
                    <button type="button" aria-label="Move down" onClick={() => moveRow(i, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ArrowDown className="size-4" /></button>
                    <button type="button" aria-label="Delete row" onClick={() => set({ rows: v.rows.filter((_, j) => j !== i) })} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!v.rows.length && (
              <tr><td colSpan={v.columns.length + 2} className="py-6 text-center text-sm text-muted-foreground">No rows yet. Click “+ Row”.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
