import { useState } from "react"

/** A field error map: { fieldName: "message" } — empty when everything is valid. */
export type Errors = Record<string, string | undefined>

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PHONE_RE = /^[+\d][\d\s\-()]{6,19}$/

export const isEmail = (v: string) => EMAIL_RE.test(v.trim())
export const isPhone = (v: string) => PHONE_RE.test(v.trim())

/** Password policy (kept in sync with the server: server/src/utils/validators.ts). */
export const PASSWORD_RULES = [
  { id: "len", label: "8–64 characters", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { id: "lower", label: "A lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "upper", label: "An uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "digit", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "A special character (e.g. ! @ # $)", test: (p: string) => /[^A-Za-z0-9\s]/.test(p) },
  { id: "space", label: "No spaces", test: (p: string) => p !== "" && /^\S+$/.test(p) },
] as const

export function passwordError(p: string): string | undefined {
  if (!p) return "Password is required"
  const failed = PASSWORD_RULES.find((r) => !r.test(p))
  return failed ? `Password needs: ${failed.label.toLowerCase()}` : undefined
}

/** Small helpers used by the screens' validate functions. */
export const required = (v: unknown, label: string) => (String(v ?? "").trim() ? undefined : `${label} is required`)
export const minLength = (v: string, n: number, label: string) => (v.trim().length >= n ? undefined : `${label} must be at least ${n} characters`)
export const maxLength = (v: string, n: number, label: string) => (v.length <= n ? undefined : `${label} must be at most ${n} characters`)
export const optionalEmail = (v: string) => (v.trim() === "" || isEmail(v) ? undefined : "Enter a valid email address")
export const optionalPhone = (v: string) => (v.trim() === "" || isPhone(v) ? undefined : "Enter a valid phone number (digits, +, -, spaces)")

/**
 * Tiny form-validation helper.
 *  - `validate(values)` returns the error map for the current values.
 *  - Errors only show for fields the user has touched, or for every field after a failed submit.
 */
export function useFormErrors<T>(values: T, validate: (v: T) => Errors) {
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const all = Object.fromEntries(Object.entries(validate(values)).filter(([, m]) => m)) as Record<string, string>

  const err = (k: string) => (submitted || touched.has(k) ? all[k] : undefined)
  return {
    errors: all,
    err,
    /** spread on an input: marks it invalid and tracks blur */
    props: (k: string) => ({
      "aria-invalid": err(k) ? true : undefined,
      onBlur: () => setTouched((s) => (s.has(k) ? s : new Set(s).add(k))),
    }),
    /** Call on submit: shows all errors and returns whether the form is valid. */
    check: () => {
      setSubmitted(true)
      return Object.keys(all).length === 0
    },
    reset: () => { setSubmitted(false); setTouched(new Set()) },
  }
}
