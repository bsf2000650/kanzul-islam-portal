import { useState } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/form"

export function ColorField({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid?: boolean }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} aria-label="Pick color" className="size-9 cursor-pointer rounded-md border bg-background p-0.5" />
      <Input value={value ?? ""} aria-invalid={invalid ? true : undefined} onChange={(e) => onChange(e.target.value)} placeholder="#4169E1" className="w-32 font-mono" maxLength={9} />
      <span className="size-6 rounded-full border" style={{ background: value }} />
    </div>
  )
}

/** Chips editor: press Enter or comma to add. */
export function TagsField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("")
  const tags = Array.isArray(value) ? value : []
  const add = () => {
    const t = draft.trim()
    if (t && !tags.includes(t)) onChange([...tags, t])
    setDraft("")
  }
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
      {tags.map((t, i) => (
        <span key={t + i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((_, j) => j !== i))}><X className="size-3" /></button>
        </span>
      ))}
      <input
        value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add() }
          else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1))
        }}
        onBlur={add}
        placeholder={tags.length ? "" : "Type and press Enter"}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  )
}
