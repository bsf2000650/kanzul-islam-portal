import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { useCrud } from "@/lib/useCrud"
import { entityLoader } from "@/lib/useOptions"
import { isEmail, maxLength, minLength, passwordError, required, useFormErrors, type Errors } from "@/lib/validation"
import type { AppUser, Role } from "@/lib/types"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { FormField, Input, PageLoader, PasswordChecklist, PasswordInput, Select, Switch } from "@/components/ui/form"
import { Badge, Card, ConfirmDialog, EmptyState, fmtDate, Modal, PageHeader, Pagination, Table, Td } from "@/components/ui/kit"
import { ListToolbar, type FilterDef } from "@/components/ui/filters"
import { PermissionMatrix } from "./Roles"

const blank = { name: "", email: "", password: "", confirm: "", role: "", isActive: true }
type Form = typeof blank

const loadUsers = entityLoader<AppUser>("users", (u) => `${u.name} (${u.email})`)

export default function Users() {
  const me = useAuth((s) => s.user)!
  const can = useAuth((s) => s.can)
  const c = useCrud<AppUser>("users")
  const roles = useQuery({ queryKey: ["roles-all"], queryFn: async () => (await api.get<Role[]>("/roles")).data })
  const [editing, setEditing] = useState<AppUser | "new" | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [del, setDel] = useState<AppUser | null>(null)
  const isNew = editing === "new"

  const validate = (f: Form): Errors => ({
    name: required(f.name, "Full name") ?? minLength(f.name, 2, "Full name") ?? maxLength(f.name, 80, "Full name"),
    email: required(f.email, "Email") ?? (isEmail(f.email) ? undefined : "Enter a valid email address"),
    role: f.role ? undefined : "Select a role",
    password: isNew || f.password ? passwordError(f.password) : undefined,
    confirm: isNew || f.password ? (f.confirm ? (f.confirm === f.password ? undefined : "Passwords do not match") : "Confirm the password") : undefined,
  })
  const v = useFormErrors(form, validate)

  const role = roles.data?.find((r) => r._id === form.role)
  const defs: FilterDef[] = [
    { key: "id", label: "User", type: "search", load: loadUsers, placeholder: "Search user…" },
    { key: "role", label: "Role", type: "select", options: (roles.data ?? []).map((r) => ({ value: r._id, label: r.name })) },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
    { key: "lastLoginAt", label: "Last login", type: "dateRange" },
    { key: "createdAt", label: "Created", type: "dateRange" },
  ]

  const open = (u: AppUser | "new") => {
    v.reset()
    setEditing(u)
    setForm(u === "new" ? { ...blank, role: roles.data?.find((r) => !r.isSystem)?._id ?? "" } : { name: u.name, email: u.email, password: "", confirm: "", role: u.role?._id ?? "", isActive: u.isActive })
  }
  const submit = () => {
    if (!v.check()) return
    const { confirm: _confirm, ...rest } = form
    const body: Record<string, unknown> = { ...rest, name: form.name.trim(), email: form.email.trim() }
    if (!isNew && !form.password) delete body.password
    c.save.mutate({ id: isNew ? undefined : (editing as AppUser)._id, body }, { onSuccess: () => { setEditing(null); roles.refetch() } })
  }

  return (
    <div>
      <PageHeader title="Users" description="Create portal users and assign them a role. A role decides what the user can access."
        actions={can("users:create") && <Button onClick={() => open("new")}><Plus /> Add user</Button>} />
      <Card>
        <ListToolbar {...c.toolbar("Search by name or email", defs)} />
        {c.list.isLoading ? <PageLoader /> : !c.items.length ? <EmptyState title="No users found" hint="Change the search or filters." /> : (
          <Table head={["User", "Role", "Status", "Last login", "Created", ""]}>
            {c.items.map((u) => (
              <tr key={u._id} className="hover:bg-muted/30">
                <Td><p className="font-medium">{u.name}{u._id === me.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{u.email}</p></Td>
                <Td><Badge tone="blue">{u.role?.name ?? "—"}</Badge></Td>
                <Td><Badge tone={u.isActive ? "green" : "gray"}>{u.isActive ? "Active" : "Inactive"}</Badge></Td>
                <Td>{fmtDate(u.lastLoginAt)}</Td>
                <Td>{fmtDate(u.createdAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {can("users:update") && <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => open(u)}><Pencil /></Button>}
                    {can("users:delete") && u._id !== me.id && <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-destructive" onClick={() => setDel(u)}><Trash2 /></Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {c.list.data && <Pagination {...c.pager} />}
      </Card>

      <Modal wide open={!!editing} onClose={() => setEditing(null)} title={isNew ? "Add user" : "Edit user"}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={c.save.isPending} onClick={submit}>Save user</Button></>}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name *" error={v.err("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} {...v.props("name")} /></FormField>
          <FormField label="Email *" error={v.err("email")}><Input type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} {...v.props("email")} /></FormField>
          <FormField label={isNew ? "Password *" : "New password"} error={v.err("password")} hint={isNew ? undefined : "Leave blank to keep the current password"}>
            <PasswordInput autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} {...v.props("password")} />
          </FormField>
          <FormField label={isNew ? "Confirm password *" : "Confirm new password"} error={v.err("confirm")}>
            <PasswordInput autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} {...v.props("confirm")} />
          </FormField>
          {(isNew || form.password) && <div className="sm:col-span-2 -mt-2"><PasswordChecklist value={form.password} /></div>}
          <FormField label="Role *" error={v.err("role")}>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} {...v.props("role")}>
              <option value="">Select a role…</option>
              {roles.data?.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
            </Select>
          </FormField>
          <div className="flex items-end pb-1"><Switch checked={form.isActive} onChange={(val) => setForm({ ...form, isActive: val })} label="Account active (can sign in)" disabled={!!editing && editing !== "new" && editing._id === me.id} /></div>
          {role && (
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium">Permissions granted by “{role.name}”</p>
              <PermissionMatrix value={role.permissions} onChange={() => undefined} disabled />
              <p className="mt-1.5 text-xs text-muted-foreground">To change these permissions, edit the role in the Roles tab.</p>
            </div>
          )}
          <button type="submit" hidden />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={c.remove.isPending} title="Delete user?" message={<>Delete <b>{del?.name}</b>? They will no longer be able to sign in. This cannot be undone.</>}
        onConfirm={() => del && c.remove.mutate(del._id, { onSuccess: () => setDel(null) })} />
    </div>
  )
}
