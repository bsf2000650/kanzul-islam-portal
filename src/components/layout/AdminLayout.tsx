import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  BookUser, ChevronDown, FileText, GraduationCap, Inbox, KeyRound, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, Wallet, X,
} from "lucide-react"
import { api, errMsg } from "@/lib/api"
import type { PageSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { FormField, PasswordChecklist, PasswordInput } from "@/components/ui/form"
import { passwordError, required, useFormErrors, type Errors } from "@/lib/validation"
import { Modal } from "@/components/ui/kit"

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; perm: string; end?: boolean }

const NAV: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard:view", end: true },
  { to: "/pages", label: "Pages", icon: FileText, perm: "pages:view" },
  { to: "/students", label: "Students", icon: GraduationCap, perm: "students:view" },
  { to: "/faculty", label: "Faculty", icon: BookUser, perm: "faculty:view" },
  { to: "/fees", label: "Fees Submission", icon: Wallet, perm: "fees:view" },
  { to: "/users", label: "Users", icon: Users, perm: "users:view" },
  { to: "/roles", label: "Roles", icon: ShieldCheck, perm: "roles:view" },
  { to: "/inquiries", label: "Students Inquiries", icon: Inbox, perm: "inquiries:view" },
]

const linkCls = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  )

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const can = useAuth((s) => s.can)
  const { pathname } = useLocation()
  const inPages = pathname.startsWith("/pages")
  const navigate = useNavigate()
  const [pagesOpen, setPagesOpen] = useState(true)
  const { data: pages } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => (await api.get<PageSummary[]>("/pages")).data,
    enabled: can("pages:view"),
  })

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV.filter((n) => can(n.perm)).map((n) => {
        if (n.to !== "/pages") {
          return (
            <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate} className={({ isActive }) => linkCls(isActive)}>
              <n.icon className="size-4.5" /> {n.label}
            </NavLink>
          )
        }
        // "Pages" opens its first sub-page (Common) by default and reveals the sub-tabs.
        const first = pages?.[0]?.key ?? "common"
        return (
          <div key={n.to}>
            <button
              type="button"
              aria-expanded={inPages && pagesOpen}
              onClick={() => {
                // Outside Pages: open the first sub-page (Common). Inside Pages: toggle the sub-menu.
                if (!inPages) { setPagesOpen(true); navigate(`/pages/${first}`); onNavigate?.() }
                else setPagesOpen((o) => !o)
              }}
              className={cn(linkCls(inPages), "w-full justify-between")}
            >
              <span className="flex items-center gap-3"><n.icon className="size-4.5" /> {n.label}</span>
              <ChevronDown className={cn("size-4 transition-transform", inPages && pagesOpen && "rotate-180")} />
            </button>
            {inPages && pagesOpen && (
              <div className="ml-5 mt-1 space-y-0.5 border-l border-sidebar-border pl-3">
                {(pages ?? []).map((p) => (
                  <NavLink
                    key={p.key} to={`/pages/${p.key}`} onClick={onNavigate}
                    className={({ isActive }) =>
                      cn("block rounded-md px-3 py-1.5 text-sm transition-colors",
                        isActive ? "bg-primary/10 font-semibold text-primary" : "text-sidebar-foreground/75 hover:bg-sidebar-accent")}
                  >
                    {p.title}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState({ cur: "", next: "", confirm: "" })
  const v = useFormErrors(f, (x): Errors => ({
    cur: required(x.cur, "Current password"),
    next: passwordError(x.next) ?? (x.next === x.cur ? "New password must be different from the current one" : undefined),
    confirm: x.confirm ? (x.confirm === x.next ? undefined : "Passwords do not match") : "Confirm the new password",
  }))
  const close = () => { setF({ cur: "", next: "", confirm: "" }); v.reset(); onClose() }
  const m = useMutation({
    mutationFn: () => api.patch("/auth/me/password", { currentPassword: f.cur, newPassword: f.next }),
    onSuccess: () => { toast.success("Password updated"); close() },
    onError: (e) => toast.error(errMsg(e)),
  })
  const submit = () => { if (v.check()) m.mutate() }
  return (
    <Modal
      open={open} onClose={close} title="Change password"
      footer={<><Button variant="outline" onClick={close}>Cancel</Button><Button disabled={m.isPending} onClick={submit}>Update password</Button></>}
    >
      <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
        <FormField label="Current password" error={v.err("cur")}><PasswordInput autoComplete="current-password" value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} {...v.props("cur")} /></FormField>
        <FormField label="New password" error={v.err("next")}>
          <PasswordInput autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} {...v.props("next")} />
          <PasswordChecklist value={f.next} />
        </FormField>
        <FormField label="Confirm new password" error={v.err("confirm")}><PasswordInput autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} {...v.props("confirm")} /></FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

export function AdminLayout() {
  const [drawer, setDrawer] = useState(false)
  const [pwd, setPwd] = useState(false)
  const user = useAuth((s) => s.user)!
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()

  const brand = (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">K</span>
      <div className="leading-tight">
        <p className="text-sm font-bold">Kanzul Islam</p>
        <p className="text-xs text-muted-foreground">Admin Portal</p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {brand}
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between">
              {brand}
              <button className="mr-3 rounded-md p-1.5 hover:bg-muted" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="size-5" /></button>
            </div>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          <button className="rounded-md p-2 hover:bg-muted lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPwd(true)}><KeyRound /> <span className="hidden sm:inline">Password</span></Button>
            <Button variant="outline" size="sm" onClick={async () => { await logout(); navigate("/login") }}><LogOut /> <span className="hidden sm:inline">Logout</span></Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      <ChangePassword open={pwd} onClose={() => setPwd(false)} />
    </div>
  )
}

