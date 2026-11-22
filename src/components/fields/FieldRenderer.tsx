import { useContext, useRef, useState } from "react"
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormField, Input, Select, Switch, Textarea } from "@/components/ui/form"
import { ConfirmDialog } from "@/components/ui/kit"
import { ValidationContext, useFieldError } from "@/lib/contentValidation"
import { assetUrl } from "@/lib/api"
import type { Field } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ImageField } from "./ImageField"
import { RichTextEditor } from "./RichTextEditor"
import { ColorField, TagsField } from "./SimpleFields"
import { TableField, type TableValue } from "./TableField"

type Obj = Record<string, unknown>

export function emptyValue(f: Field): unknown {
  switch (f.type) {
    case "boolean": return f.key === "visible" || f.key === "enabled"
    case "number": return 0
    case "tags": case "list": return []
    case "table": return { columns: [], rows: [] }
    case "group": return Object.fromEntries(f.fields.map((x) => [x.key, emptyValue(x)]))
    default: return ""
  }
}
const emptyItem = (fields: Field[]): Obj => Object.fromEntries(fields.map((f) => [f.key, emptyValue(f)]))
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()

const star = (f: Field) => ("required" in f && f.required) || ("minItems" in f && (f.minItems ?? 0) > 0 && f.type !== "list") ? " *" : ""

/** Renders any field definition as the right editor. `path` identifies the field for validation messages. */
export function FieldRenderer({ field, value, onChange, path }: { field: Field; value: unknown; onChange: (v: unknown) => void; path: string }) {
  const hint = field.help
  const error = useFieldError(path)
  const { touch } = useContext(ValidationContext)
  const bad = error ? true : undefined
  const label = field.label + star(field)
  const wrap = (node: React.ReactNode) => <div onBlurCapture={() => touch(path)}>{node}</div>

  switch (field.type) {
    case "text":
    case "url":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <Input type="text" value={(value as string) ?? ""} aria-invalid={bad} onChange={(e) => onChange(e.target.value)} placeholder={field.type === "url" ? "https://… or /page" : undefined} />
        </FormField>,
      )
    case "number":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <Input type="number" step="any" min={field.min} max={field.max} aria-invalid={bad} value={(value as number | string) ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="max-w-40" />
        </FormField>,
      )
    case "textarea":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <Textarea value={(value as string) ?? ""} aria-invalid={bad} onChange={(e) => onChange(e.target.value)} rows={3} />
        </FormField>,
      )
    case "richtext":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <div className={cn("rounded-lg", error && "ring-2 ring-destructive/40")}><RichTextEditor value={(value as string) ?? ""} onChange={onChange} /></div>
        </FormField>,
      )
    case "image":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <ImageField value={(value as string) ?? ""} onChange={onChange} />
        </FormField>,
      )
    case "color":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <ColorField value={(value as string) ?? ""} onChange={onChange} invalid={!!error} />
        </FormField>,
      )
    case "boolean":
      return (
        <div className="pt-1">
          <Switch checked={!!value} onChange={onChange} label={field.label} />
        </div>
      )
    case "select":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <Select value={(value as string) ?? ""} aria-invalid={bad} onChange={(e) => onChange(e.target.value)} className="max-w-60">
            <option value="">— none —</option>
            {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </FormField>,
      )
    case "tags":
      return wrap(
        <FormField label={label} hint={hint} error={error}>
          <TagsField value={(value as string[]) ?? []} onChange={onChange} />
        </FormField>,
      )
    case "table":
      return wrap(
        <FormField label={field.label + " *"} hint={hint} error={error}>
          <TableField value={value as TableValue} onChange={onChange} path={path} />
        </FormField>,
      )
    case "group":
      return <FieldGroup fields={field.fields} value={(value as Obj) ?? {}} onChange={onChange} title={field.label} path={path} />
    case "list":
      return <ListField field={field} value={(value as Obj[]) ?? []} onChange={onChange} path={path} />
  }
}

/** Renders fields in a 2-column responsive grid; wide editors span the full width. */
export function FieldGroup({ fields, value, onChange, title, path }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void; title?: string; path: string }) {
  const wide = (f: Field) => ["richtext", "textarea", "list", "table", "image", "tags", "group"].includes(f.type)
  return (
    <div className={cn(title && "rounded-lg border p-4")}>
      {title && <p className="mb-3 text-sm font-semibold">{title}</p>}
      <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={cn(wide(f) && "md:col-span-2")}>
            <FieldRenderer field={f} value={value[f.key]} path={`${path}.${f.key}`} onChange={(v) => onChange({ ...value, [f.key]: v })} />
          </div>
        ))}
      </div>
    </div>
  )
}

let seq = 0
const nextKey = () => `k${++seq}`

function ListField({ field, value, onChange, path }: { field: Extract<Field, { type: "list" }>; value: Obj[]; onChange: (v: Obj[]) => void; path: string }) {
  const listError = useFieldError(path)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  // Stable keys so editors keep their state when items are reordered or removed.
  const keys = useRef<string[]>([])
  while (keys.current.length < value.length) keys.current.push(nextKey())
  if (keys.current.length > value.length) keys.current.length = value.length
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const update = (i: number, item: Obj) => onChange(value.map((v, j) => (j === i ? item : v)))
  const add = () => {
    const k = nextKey()
    keys.current.push(k)
    setOpen((s) => new Set(s).add(k))
    onChange([...value, emptyItem(field.fields)])
  }
  const remove = (i: number) => {
    keys.current.splice(i, 1)
    onChange(value.filter((_, j) => j !== i))
  }
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const arr = [...value]; const ks = keys.current
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    ;[ks[i], ks[j]] = [ks[j], ks[i]]
    onChange(arr)
  }
  const duplicate = (i: number) => {
    keys.current.splice(i + 1, 0, nextKey())
    const arr = [...value]
    arr.splice(i + 1, 0, structuredClone(value[i]))
    onChange(arr)
  }

  const ctx = useContext(ValidationContext)
  const itemErrors = (prefix: string) => Object.keys(ctx.errors).some((k) => k.startsWith(prefix + ".") && (ctx.show || ctx.touched.has(k)))
  const imageKey = field.fields.find((f) => f.type === "image")?.key
  const titleOf = (item: Obj, i: number) => {
    const t = field.titleField ? stripHtml(String(item[field.titleField] ?? "")) : ""
    return t ? (t.length > 70 ? t.slice(0, 70) + "…" : t) : `${field.itemLabel} ${i + 1}`
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium">{field.label}{(field.minItems ?? 0) > 0 && " *"} <span className="text-muted-foreground">({value.length})</span></p>
        <Button type="button" size="sm" variant="outline" onClick={add}><Plus /> Add {field.itemLabel}</Button>
      </div>
      {field.help && <p className="mb-2 text-xs text-muted-foreground">{field.help}</p>}
      <div className="space-y-2">
        {value.map((item, i) => {
          const k = keys.current[i]
          const itemPath = `${path}.${i}`
          const isOpen = open.has(k) || itemErrors(itemPath)
          const thumb = imageKey ? (item[imageKey] as string) : ""
          return (
            <div key={k} className="rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <button type="button" onClick={() => toggle(k)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-muted" aria-expanded={isOpen}>
                  {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                  {thumb && <img src={assetUrl(thumb)} alt="" className="size-8 shrink-0 rounded object-cover" />}
                  <span className="truncate text-sm font-medium">{titleOf(item, i)}</span>
                  <span className="ml-1 shrink-0 text-xs text-muted-foreground">#{i + 1}</span>
                  {itemErrors(itemPath) && <span className="ml-1 shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Needs attention</span>}
                </button>
                <div className="flex shrink-0">
                  <IconBtn label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></IconBtn>
                  <IconBtn label="Move down" onClick={() => move(i, 1)} disabled={i === value.length - 1}><ArrowDown /></IconBtn>
                  <IconBtn label="Duplicate" onClick={() => duplicate(i)}><Copy /></IconBtn>
                  <IconBtn label="Delete" onClick={() => setPendingDelete(i)} danger><Trash2 /></IconBtn>
                </div>
              </div>
              {isOpen && (
                <div className="border-t bg-background p-4">
                  <FieldGroup fields={field.fields} value={item} path={itemPath} onChange={(v) => update(i, v)} />
                </div>
              )}
            </div>
          )
        })}
        {!value.length && <p className={cn("rounded-lg border border-dashed py-5 text-center text-sm text-muted-foreground", listError && "border-destructive/50")}>Nothing here yet. Click “Add {field.itemLabel}”.</p>}
      </div>
      {listError && <p role="alert" className="mt-1.5 text-xs text-destructive">{listError}</p>}
      <ConfirmDialog
        open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title={`Delete this ${field.itemLabel.toLowerCase()}?`}
        message={pendingDelete !== null ? <>“{titleOf(value[pendingDelete] ?? {}, pendingDelete)}” will be removed from the page. You can still discard your changes before saving.</> : null}
        onConfirm={() => { if (pendingDelete !== null) remove(pendingDelete); setPendingDelete(null) }}
      />
    </div>
  )
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className={cn("rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 [&_svg]:size-4", danger && "hover:bg-destructive/10 hover:text-destructive")}
    >
      {children}
    </button>
  )
}
