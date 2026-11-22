import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormField, Input, PageLoader, Switch, Textarea } from "@/components/ui/form"
import { Badge, Card, ConfirmDialog, EmptyState, fmtDate, Modal, PageHeader, Pagination, Table, Td } from "@/components/ui/kit"
import { ListToolbar, type FilterDef } from "@/components/ui/filters"
import { ImageField } from "@/components/fields/ImageField"
import { TagsField } from "@/components/fields/SimpleFields"
import { assetUrl } from "@/lib/api"
import { useCrud } from "@/lib/useCrud"
import { entityLoader, useOptions } from "@/lib/useOptions"
import { maxLength, minLength, optionalEmail, optionalPhone, required, useFormErrors, type Errors } from "@/lib/validation"
import type { Faculty as F } from "@/lib/types"
import { useAuth } from "@/store/auth"

const blank = { name: "", email: "", phone: "", designation: "", department: "", qualification: "", experience: "", courses: [] as string[], photo: "", joiningDate: "", isActive: true, notes: "" }
type Form = typeof blank

const validate = (f: Form): Errors => ({
  name: required(f.name, "Full name") ?? minLength(f.name, 2, "Full name") ?? maxLength(f.name, 120, "Full name"),
  designation: required(f.designation, "Designation") ?? maxLength(f.designation, 100, "Designation"),
  department: maxLength(f.department, 100, "Department"),
  qualification: maxLength(f.qualification, 120, "Qualification"),
  experience: maxLength(f.experience, 60, "Experience"),
  phone: optionalPhone(f.phone),
  email: optionalEmail(f.email),
  joiningDate: required(f.joiningDate, "Joining date"),
  notes: maxLength(f.notes, 1000, "Notes"),
})

const loadFaculty = entityLoader<F>("faculty", (f) => (f.designation ? `${f.name} — ${f.designation}` : f.name))

export default function Faculty() {
  const can = useAuth((s) => s.can)
  const c = useCrud<F>("faculty")
  const opt = useOptions("faculty")
  const [editing, setEditing] = useState<F | "new" | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [del, setDel] = useState<F | null>(null)
  const v = useFormErrors(form, validate)
  const set = <K extends keyof Form>(k: K, val: Form[K]) => setForm((f) => ({ ...f, [k]: val }))

  const defs: FilterDef[] = [
    { key: "id", label: "Faculty", type: "search", load: loadFaculty, placeholder: "Search faculty…" },
    { key: "designation", label: "Designation", type: "select", options: opt("designations") },
    { key: "qualification", label: "Graduation / qualification", type: "select", options: opt("qualifications") },
    { key: "contact", label: "Contact (phone or email)", type: "text", placeholder: "e.g. 0300 or name@mail.com" },
    { key: "courses", label: "Courses", type: "select", options: opt("courses") },
    { key: "joiningDate", label: "Joined", type: "dateRange" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  ]

  const open = (f: F | "new") => {
    v.reset()
    setEditing(f)
    setForm(f === "new" ? blank : { ...blank, ...f, joiningDate: f.joiningDate?.slice(0, 10) ?? "" })
  }
  const submit = () => {
    if (!v.check()) return
    c.save.mutate(
      { id: editing === "new" ? undefined : (editing as F)._id, body: { ...form, joiningDate: form.joiningDate || null } },
      { onSuccess: () => setEditing(null) },
    )
  }

  return (
    <div>
      <PageHeader title="Faculty" description="Manage teaching staff and their profiles."
        actions={can("faculty:create") && <Button onClick={() => open("new")}><Plus /> Add faculty</Button>} />
      <Card>
        <ListToolbar {...c.toolbar("Search by name, designation, phone or email", defs)} />
        {c.list.isLoading ? <PageLoader /> : !c.items.length ? (
          <EmptyState title="No faculty members found" hint="Add a faculty member, or change the search and filters." />
        ) : (
          <Table head={["Faculty", "Designation", "Contact", "Courses", "Joined", "Status", ""]}>
            {c.items.map((f) => (
              <tr key={f._id} className="hover:bg-muted/30">
                <Td>
                  <div className="flex items-center gap-3">
                    {f.photo ? <img src={assetUrl(f.photo)} alt="" className="size-9 rounded-full object-cover" /> :
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{f.name.slice(0, 1)}</span>}
                    <div><p className="font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{f.qualification}</p></div>
                  </div>
                </Td>
                <Td>{f.designation || "—"}{f.department && <p className="text-xs text-muted-foreground">{f.department}</p>}</Td>
                <Td>{f.phone || "—"}<p className="text-xs text-muted-foreground">{f.email}</p></Td>
                <Td className="max-w-52"><div className="flex flex-wrap gap-1">{f.courses.map((x) => <Badge key={x} tone="violet">{x}</Badge>)}</div></Td>
                <Td>{fmtDate(f.joiningDate)}</Td>
                <Td><Badge tone={f.isActive ? "green" : "gray"}>{f.isActive ? "Active" : "Inactive"}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {can("faculty:update") && <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => open(f)}><Pencil /></Button>}
                    {can("faculty:delete") && <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-destructive" onClick={() => setDel(f)}><Trash2 /></Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {c.list.data && <Pagination {...c.pager} />}
      </Card>

      <Modal wide open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add faculty member" : "Edit faculty member"}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={c.save.isPending} onClick={submit}>Save</Button></>}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Photo" className="sm:col-span-2"><ImageField compact value={form.photo} onChange={(val) => set("photo", val)} /></FormField>
          <FormField label="Full name *" error={v.err("name")}><Input value={form.name} onChange={(e) => set("name", e.target.value)} {...v.props("name")} /></FormField>
          <FormField label="Designation *" error={v.err("designation")}><Input value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Senior Instructor" {...v.props("designation")} /></FormField>
          <FormField label="Department" error={v.err("department")}><Input value={form.department} onChange={(e) => set("department", e.target.value)} {...v.props("department")} /></FormField>
          <FormField label="Qualification" error={v.err("qualification")}><Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} {...v.props("qualification")} /></FormField>
          <FormField label="Phone" error={v.err("phone")}><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX-XXXXXXX" {...v.props("phone")} /></FormField>
          <FormField label="Email" error={v.err("email")}><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} {...v.props("email")} /></FormField>
          <FormField label="Experience" error={v.err("experience")}><Input value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 5+ years" {...v.props("experience")} /></FormField>
          <FormField label="Joining date *" error={v.err("joiningDate")}><Input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} {...v.props("joiningDate")} /></FormField>
          <FormField label="Courses taught" className="sm:col-span-2" hint="Press Enter after each course"><TagsField value={form.courses} onChange={(val) => set("courses", val)} /></FormField>
          <FormField label="Notes" className="sm:col-span-2" error={v.err("notes")}><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} {...v.props("notes")} /></FormField>
          <div className="sm:col-span-2"><Switch checked={form.isActive} onChange={(val) => set("isActive", val)} label="Active" /></div>
          <button type="submit" hidden />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={c.remove.isPending} title="Delete faculty member?"
        message={<>This permanently deletes <b>{del?.name}</b>.</>} onConfirm={() => del && c.remove.mutate(del._id, { onSuccess: () => setDel(null) })} />
    </div>
  )
}
