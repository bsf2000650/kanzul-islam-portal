import * as React from "react"
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react"
import { PASSWORD_RULES } from "@/lib/validation"
import { cn } from "@/lib/utils"

const base =
  "w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...p }, ref) => <input ref={ref} className={cn(base, "h-9", className)} {...p} />,
)
Input.displayName = "Input"

/** Password input with a show/hide (eye) button. */
export const PasswordInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
  ({ className, ...p }, ref) => {
    const [show, setShow] = React.useState(false)
    return (
      <div className="relative">
        <input ref={ref} type={show ? "text" : "password"} className={cn(base, "h-9 pr-10", className)} {...p} />
        <button
          type="button" tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
          onClick={() => setShow((v) => !v)}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = "PasswordInput"

/** Live checklist of the password policy. */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value)
        return (
          <li key={r.id} className={cn("flex items-center gap-1.5 text-xs", ok ? "text-emerald-600" : "text-muted-foreground")}>
            {ok ? <Check className="size-3.5" /> : <X className="size-3.5 opacity-60" />}
            {r.label}
          </li>
        )
      })}
    </ul>
  )
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(base, "min-h-20 py-2", className)} {...p} />,
)
Textarea.displayName = "Textarea"

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref} className={cn(base, "h-9 pr-8", className)} {...p}>
      {children}
    </select>
  ),
)
Select.displayName = "Select"

export function Label({ className, ...p }: React.ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-sm font-medium", className)} {...p} />
}

/** Label + control + hint/error wrapper. */
export function FormField({
  label, hint, error, children, className,
}: { label?: React.ReactNode; hint?: React.ReactNode; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button" role="switch" aria-checked={checked} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
      </button>
      {label}
    </label>
  )
}

export function Checkbox({ checked, onChange, label, indeterminate, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; indeterminate?: boolean; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm", disabled && "cursor-not-allowed opacity-60")}>
      <input
        type="checkbox" checked={checked} disabled={disabled}
        ref={(el) => { if (el) el.indeterminate = !!indeterminate && !checked }}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-input accent-[var(--primary)]"
      />
      {label}
    </label>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />
}

export function PageLoader() {
  return <div className="flex h-60 items-center justify-center text-muted-foreground"><Spinner className="size-6" /></div>
}
