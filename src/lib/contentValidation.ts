import { createContext, useContext } from "react"
import type { Field, Section } from "@/lib/types"

type Obj = Record<string, unknown>
const strip = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()

// Kept in sync with server/src/content/validate.ts (the server re-checks everything on save).
const FORMATS: Record<string, [RegExp, string]> = {
  email: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"],
  phone: [/^[+\d][\d\s\-()]{6,19}$/, "Enter a valid phone number"],
  digits: [/^\d{8,15}$/, "Digits only, with country code (e.g. 923001234567)"],
  url: [/^(https?:\/\/\S+|\/\S*|#\S*|mailto:\S+|tel:\S+)$/i, "Enter a valid link (https://… or /page)"],
  hex: [/^#[0-9a-f]{6}$/i, "Use a 6-digit hex color like #4169E1"],
  slug: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only"],
}

function check(f: Field, v: unknown, path: string, out: Record<string, string>) {
  switch (f.type) {
    case "group": {
      const o = (v ?? {}) as Obj
      f.fields.forEach((c) => check(c, o[c.key], `${path}.${c.key}`, out))
      return
    }
    case "list": {
      const arr = Array.isArray(v) ? (v as Obj[]) : []
      const min = f.minItems ?? 0
      if (arr.length < min) out[path] = `Add at least ${min} ${f.itemLabel.toLowerCase()}${min === 1 ? "" : "s"}`
      arr.forEach((item, i) => f.fields.forEach((c) => check(c, item?.[c.key], `${path}.${i}.${c.key}`, out)))
      if (f.uniqueKey) {
        const seen = new Set<string>()
        arr.forEach((item, i) => {
          const k = String(item?.[f.uniqueKey!] ?? "").trim().toLowerCase()
          if (k && seen.has(k)) out[`${path}.${i}.${f.uniqueKey}`] = "This value is already used by another item"
          seen.add(k)
        })
      }
      return
    }
    case "table": {
      const cols = ((v ?? {}) as { columns?: { label?: string }[] }).columns ?? []
      if (cols.length < (f.minColumns ?? 0)) out[path] = "Add at least one column"
      cols.forEach((c, i) => { if (!String(c.label ?? "").trim()) out[`${path}.columns.${i}.label`] = "Column title is required" })
      return
    }
    case "boolean": return
    case "tags": {
      const arr = Array.isArray(v) ? v : []
      if (arr.length < (f.minItems ?? 0)) out[path] = "Add at least one item"
      return
    }
    case "number": {
      const n = Number(v)
      if (v === "" || v === null || v === undefined || !Number.isFinite(n)) { if (f.required) out[path] = "Enter a number"; return }
      if (f.min !== undefined && n < f.min) out[path] = `Must be at least ${f.min}`
      else if (f.max !== undefined && n > f.max) out[path] = `Must be at most ${f.max}`
      return
    }
    default: {
      const raw = typeof v === "string" ? v : ""
      const text = f.type === "richtext" ? strip(raw) : raw.trim()
      if (!text) { if (f.required) out[path] = f.type === "image" ? "Please upload an image" : "This field is required"; return }
      if (f.maxLength && text.length > f.maxLength && f.type !== "richtext") { out[path] = `Must be at most ${f.maxLength} characters`; return }
      const rule = f.format && FORMATS[f.format]
      if (rule && !rule[0].test(f.type === "image" ? raw : text)) out[path] = rule[1]
    }
  }
}

/** { "section.field.0.sub": "message" } — empty when the page content is valid. */
export function validateContent(sections: Section[], content: Record<string, Obj>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const s of sections) {
    const sc = content[s.key] ?? {}
    s.fields.forEach((f) => check(f, sc[f.key], `${s.key}.${f.key}`, out))
  }
  return out
}

/** Errors are provided by the page editor and read by each field by its path. */
export const ValidationContext = createContext<{ errors: Record<string, string>; show: boolean; touched: Set<string>; touch: (p: string) => void }>({
  errors: {}, show: false, touched: new Set(), touch: () => undefined,
})

export function useFieldError(path: string): string | undefined {
  const { errors, show, touched } = useContext(ValidationContext)
  return show || touched.has(path) ? errors[path] : undefined
}
/** True when any field under this path (e.g. a list item) has a visible error. */
export function useHasErrorUnder(prefix: string): boolean {
  const { errors, show, touched } = useContext(ValidationContext)
  return Object.keys(errors).some((k) => (k === prefix || k.startsWith(prefix + ".")) && (show || touched.has(k)))
}
