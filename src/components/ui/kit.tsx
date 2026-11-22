import * as React from "react"
import { useEffect } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, Inbox, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/form"
import { cn } from "@/lib/utils"

export function Card({ className, ...p }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow-xs", className)} {...p} />
}

export function Badge({
  tone = "gray", className, children,
}: { tone?: "gray" | "green" | "red" | "amber" | "blue" | "violet"; className?: string; children: React.ReactNode }) {
  const tones = {
    gray: "bg-muted text-muted-foreground",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
  }
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({
  open, onClose, title, children, footer, wide,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cn("w-full rounded-xl bg-background shadow-xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open, title, message, confirmLabel = "Delete", onConfirm, onClose, busy,
}: { open: boolean; title: string; message: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean }) {
  return (
    <Modal
      open={open} onClose={onClose} title={title}
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
      </>}
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Inbox className="size-9 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="pl-8" />
    </div>
  )
}

export const PAGE_SIZES = [10, 20, 50, 100] as const

export function Pagination({
  page, pages, total, limit, onPage, onLimit,
}: { page: number; pages: number; total: number; limit: number; onPage: (p: number) => void; onLimit: (n: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <span>{total === 0 ? "No records" : `Showing ${from}–${to} of ${total} ${total === 1 ? "record" : "records"}`}</span>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          Rows per page
          <select
            value={limit} onChange={(e) => onLimit(Number(e.target.value))} aria-label="Rows per page"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft /></Button>
          <span>Page {page} of {pages}</span>
          <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight /></Button>
        </div>
      </div>
    </div>
  )
}

/** Simple responsive table wrapper. */
export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  )
}
export const Td = ({ className, ...p }: React.ComponentProps<"td">) => <td className={cn("px-4 py-3 align-middle", className)} {...p} />

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = React.useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export const money = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`
export const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—")
