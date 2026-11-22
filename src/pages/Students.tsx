import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormField, Input, PageLoader, Select, Textarea } from "@/components/ui/form"
import { Badge, Card, ConfirmDialog, EmptyState, fmtDate, Modal, PageHeader, Pagination, Table, Td, money } from "@/components/ui/kit"
import { ListToolbar, type FilterDef } from "@/components/ui/filters"
import { useCrud } from "@/lib/useCrud"
import { entityLoader, useOptions } from "@/lib/useOptions"
import { maxLength, minLength, optionalEmail, optionalPhone, required, useFormErrors, type Errors } from "@/lib/validation"
import type { Student } from "@/lib/types"
import { useAuth } from "@/store/auth"

const today = () => new Date().toISOString().slice(0, 10)
const blank = { rollNo: "", name: "", fatherName: "", email: "", phone: "", cnic: "", address: "", course: "", batch: "", admissionDate: today(), totalFee: "" as string | number, status: "active", notes: "" }
type Form = typeof blank
const tone = { active: "green", completed: "blue", dropped: "red" } as const

const validate = (f: Form): Errors => ({
  name: required(f.name, "Full name") ?? minLength(f.name, 2, "Full name") ?? maxLength(f.name, 120, "Full name"),
  fatherName: maxLength(f.fatherName, 120, "Father's name"),
  rollNo: maxLength(f.rollNo, 30, "Roll no"),
  phone: optionalPhone(f.phone),
  email: optionalEmail(f.email),
  cnic: f.cnic.trim() && !/^\d{5}-?\d{7}-?\d$/.test(f.cnic.trim()) ? "Enter 13 digits, e.g. 35202-1234567-1" : undefined,
  course: required(f.course, "Course"),
  admissionDate: required(f.admissionDate, "Admission date"),
  totalFee: f.totalFee === "" ? "Total fee is required (enter 0 if free)" : Number(f.totalFee) < 0 || !Number.isFinite(Number(f.totalFee)) ? "Enter a valid amount (0 or more)" : undefined,
  address: maxLength(f.address, 300, "Address"),
  notes: maxLength(f.notes, 1000, "Notes"),
})

const loadStudents = entityLoader<Student>("students", (s) => (s.rollNo ? `${s.name} (${s.rollNo})` : s.name))

export default function Students() {
  const can = useAuth((s) => s.can)
  const c = useCrud<Student>("students")
  const opt = useOptions("students")
  const [editing, setEditing] = useState<Student | "new" | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [del, setDel] = useState<Student | null>(null)
  const v = useFormErrors(form, validate)
  const set = <K extends keyof Form>(k: K, val: Form[K]) => setForm((f) => ({ ...f, [k]: val }))

  const defs: FilterDef[] = [
    { key: "id", label: "Student", type: "search", load: loadStudents, placeholder: "Search student…" },
    { key: "rollNo", label: "Roll no", type: "text", placeholder: "e.g. KI-2026" },
    { key: "course", label: "Course", type: "search", options: opt("courses"), placeholder: "Search course…" },
    { key: "phone", label: "Phone", type: "text", placeholder: "e.g. 0300" },
    { key: "admissionDate", label: "Admission date", type: "dateRange" },
    { key: "feeStatus", label: "Fee status", type: "select", options: [{ value: "paid", label: "Paid in full" }, { value: "partial", label: "Partially paid" }, { value: "unpaid", label: "Unpaid" }] },
    { key: "totalFee", label: "Total fee", type: "numberRange", prefix: "Rs" },
    { key: "status", label: "Status", type: "select", options: [{ value: "active", label: "Active" }, { value: "completed", label: "Completed" }, { value: "dropped", label: "Dropped" }] },
  ]

  const open = (s: Student | "new") => {
    v.reset()
    setEditing(s)
    setForm(s === "new" ? { ...blank, admissionDate: today() } : { ...blank, ...s, admissionDate: s.admissionDate?.slice(0, 10) ?? "", totalFee: s.totalFee })
  }
  const submit = () => {
    if (!v.check()) return
    c.save.mutate(
      { id: editing === "new" ? undefined : (editing as Student)._id, body: { ...form, name: form.name.trim(), totalFee: Number(form.totalFee) } },
      { onSuccess: () => setEditing(null) },
    )
  }

  return (
    <div>
      <PageHeader title="Students" description="Manage enrolled students and their fee plans."
        actions={can("students:create") && <Button onClick={() => open("new")}><Plus /> Add student</Button>} />
      <Card>
        <ListToolbar {...c.toolbar("Search by name, roll no, phone or course", defs)} />
        {c.list.isLoading ? <PageLoader /> : !c.items.length ? (
          <EmptyState title="No students found" hint="Add a student, or change the search and filters." />
        ) : (
          <Table head={["Roll no", "Student", "Course", "Phone", "Admission", "Fee (paid / total)", "Status", ""]}>
            {c.items.map((s) => (
              <tr key={s._id} className="hover:bg-muted/30">
                <Td className="font-mono text-xs">{s.rollNo || "—"}</Td>
                <Td><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.fatherName && `S/o ${s.fatherName}`}</p></Td>
                <Td>{s.course || "—"}{s.batch && <span className="text-xs text-muted-foreground"> · {s.batch}</span>}</Td>
                <Td>{s.phone || "—"}</Td>
                <Td>{fmtDate(s.admissionDate)}</Td>
                <Td>
                  <span className="whitespace-nowrap">{money(s.paid ?? 0)} / {money(s.totalFee)}</span>{" "}
                  {s.feeCleared ? <Badge tone="green">Cleared</Badge> : (s.remaining ?? 0) > 0 && <Badge tone="amber">Due {money(s.remaining ?? 0)}</Badge>}
                </Td>
                <Td><Badge tone={tone[s.status]}>{s.status}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    {can("students:update") && <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => open(s)}><Pencil /></Button>}
                    {can("students:delete") && <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-destructive" onClick={() => setDel(s)}><Trash2 /></Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {c.list.data && <Pagination {...c.pager} />}
      </Card>

      <Modal wide open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add student" : "Edit student"}
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={c.save.isPending} onClick={submit}>Save</Button></>}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name *" error={v.err("name")}><Input value={form.name} onChange={(e) => set("name", e.target.value)} {...v.props("name")} /></FormField>
          <FormField label="Father's name" error={v.err("fatherName")}><Input value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} {...v.props("fatherName")} /></FormField>
          <FormField label="Roll / registration no" error={v.err("rollNo")}><Input value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} {...v.props("rollNo")} /></FormField>
          <FormField label="Phone" error={v.err("phone")}><Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="03XX-XXXXXXX" {...v.props("phone")} /></FormField>
          <FormField label="Email" error={v.err("email")}><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} {...v.props("email")} /></FormField>
          <FormField label="CNIC / B-Form" error={v.err("cnic")}><Input value={form.cnic} onChange={(e) => set("cnic", e.target.value)} placeholder="35202-1234567-1" {...v.props("cnic")} /></FormField>
          <FormField label="Course *" error={v.err("course")}><Input value={form.course} onChange={(e) => set("course", e.target.value)} placeholder="e.g. Full Stack Development" {...v.props("course")} /></FormField>
          <FormField label="Batch"><Input value={form.batch} onChange={(e) => set("batch", e.target.value)} placeholder="e.g. Batch 12" /></FormField>
          <FormField label="Admission date *" error={v.err("admissionDate")}><Input type="date" value={form.admissionDate} onChange={(e) => set("admissionDate", e.target.value)} {...v.props("admissionDate")} /></FormField>
          <FormField label="Total course fee (Rs) *" error={v.err("totalFee")}><Input type="number" min={0} value={form.totalFee} onChange={(e) => set("totalFee", e.target.value)} {...v.props("totalFee")} /></FormField>
          <FormField label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}><option value="active">Active</option><option value="completed">Completed</option><option value="dropped">Dropped</option></Select>
          </FormField>
          <FormField label="Address" error={v.err("address")}><Input value={form.address} onChange={(e) => set("address", e.target.value)} {...v.props("address")} /></FormField>
          <FormField label="Notes" className="sm:col-span-2" error={v.err("notes")}><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} {...v.props("notes")} /></FormField>
          <button type="submit" hidden />
        </form>
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={c.remove.isPending} title="Delete student?"
        message={<>This permanently deletes <b>{del?.name}</b> and all their fee records. This cannot be undone.</>}
        onConfirm={() => del && c.remove.mutate(del._id, { onSuccess: () => setDel(null) })} />
    </div>
  )
}
