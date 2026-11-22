import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Lock, Pencil, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { useCrud } from "@/lib/useCrud"
import type { PermissionGroup, Role } from "@/lib/types"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { Checkbox, FormField, Input, PageLoader, Textarea } from "@/components/ui/form"
import { Badge, Card, ConfirmDialog, EmptyState, Modal, PageHeader, Pagination } from "@/components/ui/kit"
import { ListToolbar, type FilterDef } from "@/components/ui/filters"
import { maxLength, minLength, required, useFormErrors, type Errors } from "@/lib/validation"

const ACTION_LABEL: Record<string, string> = { view: "View", create: "Create", update: "Edit", delete: "Delete" }

export function usePermissionCatalog() {
  return useQuery({ queryKey: ["permissions"], queryFn: async () => (await api.get<PermissionGroup[]>("/roles/permissions")).data, staleTime: Infinity })
}

/** Resource × action checkbox grid used when creating/editing a role. */
export function PermissionMatrix({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const { data: catalog } = usePermissionCatalog()
  if (!catalog) return <PageLoader />
  const all = value.includes("*")
  const has = (p: string) => all || value.includes(p)
  const toggle = (p: string, on: boolean) => onChange(on ? [...new Set([...value, p])] : value.filter((x) => x !== p))
  const toggleRow = (g: PermissionGroup, on: boolean) => {
    const keys = g.actions.map((a) => `${g.resource}:${a}`)
    onChange(on ? [...new Set([...value, ...keys])] : value.filter((x) => !keys.includes(x)))
  }
  const everything = catalog.flatMap((g) => g.actions.map((a) => `${g.resource}:${a}`))

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Area</th>
            {["view", "create", "update", "delete"].map((a) => <th key={a} className="px-3 py-2 text-center font-medium">{ACTION_LABEL[a]}</th>)}
            <th className="px-3 py-2 text-center font-medium">All</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {catalog.map((g) => {
            const rowAll = g.actions.every((a) => has(`${g.resource}:${a}`))
            const rowSome = g.actions.some((a) => has(`${g.resource}:${a}`))
            return (
              <tr key={g.resource}>
                <td className="px-3 py-2 font-medium">{g.label}</td>
                {["view", "create", "update", "delete"].map((a) => (
                  <td key={a} className="px-3 py-2 text-center">
                    {g.actions.includes(a) ? <Checkbox checked={has(`${g.resource}:${a}`)} disabled={disabled} onChange={(on) => toggle(`${g.resource}:${a}`, on)} /> : <span className="text-muted-foreground/40">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-center"><Checkbox checked={rowAll} indeterminate={rowSome && !rowAll} disabled={disabled} onChange={(on) => toggleRow(g, on)} /></td>
              </tr>
            )
          })}
        </tbody>
        {!disabled && (
          <tfoot><tr><td colSpan={6} className="border-t bg-muted/30 px-3 py-2">
            <button type="button" className="mr-4 text-xs font-medium text-primary hover:underline" onClick={() => onChange(everything)}>Select all</button>
            <button type="button" className="text-xs font-medium text-muted-foreground hover:underline" onClick={() => onChange([])}>Clear all</button>
          </td></tr></tfoot>
        )}
      </table>
    </div>
  )
}

export const countPerms = (p: string[]) => (p.includes("*") ? "All permissions" : `${p.length} permission${p.length === 1 ? "" : "s"}`)

type RoleForm = { name: string; description: string; permissions: string[] }

export default function Roles() {
  const can = useAuth((s) => s.can)
  const c = useCrud<Role>("roles")
  // Full (capped) list: used for the filter options and the unique-name check. The visible page comes from c.items.
  const roles = useQuery({ queryKey: ["roles-all"], queryFn: async () => (await api.get<Role[]>("/roles")).data })
  const [editing, setEditing] = useState<Role | "new" | null>(null)
  const [form, setForm] = useState<RoleForm>({ name: "", description: "", permissions: [] })
  const [del, setDel] = useState<Role | null>(null)

  const validate = (f: RoleForm): Errors => ({
    name: required(f.name, "Role name") ?? minLength(f.name, 2, "Role name") ?? maxLength(f.name, 60, "Role name")
      ?? (roles.data?.some((r) => r.name.toLowerCase() === f.name.trim().toLowerCase() && (editing === "new" || r._id !== (editing as Role | null)?._id)) ? "A role with this name already exists" : undefined),
    description: maxLength(f.description, 300, "Description"),
    permissions: f.permissions.length ? undefined : "Choose at least one permission",
  })
  const v = useFormErrors(form, validate)

  const defs: FilterDef[] = [
    { key: "id", label: "Role", type: "search", options: (roles.data ?? []).map((r) => ({ value: r._id, label: r.name })), placeholder: "Search role…" },
    { key: "description", label: "Description contains", type: "text", placeholder: "Words in the description" },
    { key: "type", label: "Type", type: "select", options: [{ value: "system", label: "System (locked)" }, { value: "custom", label: "Custom" }] },
    { key: "permissions", label: "Permissions", type: "numberRange" },
    { key: "users", label: "Users assigned", type: "numberRange" },
  ]

  const refresh = () => { roles.refetch(); c.invalidate() }
  const open = (r: Role | "new") => {
    v.reset()
    setEditing(r)
    setForm(r === "new" ? { name: "", description: "", permissions: ["dashboard:view"] } : { name: r.name, description: r.description, permissions: r.permissions })
  }
  const submit = () => {
    if (!v.check()) return
    c.save.mutate({ id: editing === "new" ? undefined : (editing as Role)._id, body: { ...form, name: form.name.trim() } }, { onSuccess: () => { setEditing(null); refresh() } })
  }

  return (
    <div>
      <PageHeader title="Roles" description="Create roles and choose exactly what each role is allowed to do."
        actions={can("roles:create") && <Button onClick={() => open("new")}><Plus /> New role</Button>} />
      <Card className="mb-4">
        <ListToolbar {...c.toolbar("Search by role name or description", defs)} />
        {c.list.isLoading ? <PageLoader /> : !c.items.length ? <EmptyState title="No roles found" hint="Change the search or filters." /> : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {c.items.map((r) => (
              <Card key={r._id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">{r.name}{r.isSystem && <Lock className="size-3.5 text-muted-foreground" aria-label="System role" />}</h3>
                  <Badge tone="blue">{r.userCount ?? 0} user{r.userCount === 1 ? "" : "s"}</Badge>
                </div>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{r.description || "No description"}</p>
                <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{countPerms(r.permissions)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.permissions.includes("*") ? <Badge tone="green">Full access</Badge> :
                    [...new Set(r.permissions.map((p) => p.split(":")[0]))].map((x) => <Badge key={x}>{x}</Badge>)}
                </div>
                {!r.isSystem && (
                  <div className="mt-4 flex gap-2 border-t pt-3">
                    {can("roles:update") && <Button variant="outline" size="sm" onClick={() => open(r)}><Pencil /> Edit</Button>}
                    {can("roles:delete") && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDel(r)}><Trash2 /> Delete</Button>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        {c.list.data && <Pagination {...c.pager} />}
      </Card>

      <Modal wide open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "New role" : "Edit role"}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={c.save.isPending} onClick={submit}>Save role</Button></>}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
          <FormField label="Role name *" error={v.err("name")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Accountant" {...v.props("name")} /></FormField>
          <FormField label="Description" error={v.err("description")}><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} {...v.props("description")} /></FormField>
          <div>
            <p className="mb-1.5 text-sm font-medium">Permissions *</p>
            <PermissionMatrix value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} />
            {v.err("permissions") && <p role="alert" className="mt-1 text-xs text-destructive">{v.err("permissions")}</p>}
          </div>
          <button type="submit" hidden />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={c.remove.isPending} title="Delete role?" message={<>Delete the <b>{del?.name}</b> role? Roles assigned to users cannot be deleted. This cannot be undone.</>}
        onConfirm={() => del && c.remove.mutate(del._id, { onSuccess: () => { setDel(null); refresh() } })} />
    </div>
  )
}
