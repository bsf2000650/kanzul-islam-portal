import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { History, Plus, Trash2 } from "lucide-react"
import { api, errMsg } from "@/lib/api"
import type { FeePayment, FeeSummaryRow, Paged } from "@/lib/types"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { FormField, Input, PageLoader, Select } from "@/components/ui/form"
import { Badge, Card, ConfirmDialog, EmptyState, fmtDate, Modal, PageHeader, Pagination, Table, Td, money } from "@/components/ui/kit"
import { ListToolbar, type FilterDef } from "@/components/ui/filters"
import { useCrud } from "@/lib/useCrud"
import { entityLoader, useOptions } from "@/lib/useOptions"
import { maxLength, required, useFormErrors, type Errors } from "@/lib/validation"

const tone = { paid: "green", partial: "amber", unpaid: "red" } as const
const label = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" } as const
const loadStudents = entityLoader<FeeSummaryRow>("fees/summary", (s) => (s.rollNo ? `${s.name} (${s.rollNo})` : s.name))

export default function Fees() {
  const can = useAuth((s) => s.can)
  const qc = useQueryClient()
  const c = useCrud<FeeSummaryRow>("fees/summary")
  const opt = useOptions("fees")
  const [paying, setPaying] = useState<FeeSummaryRow | null>(null)
  const [history, setHistory] = useState<FeeSummaryRow | null>(null)

  const defs: FilterDef[] = [
    { key: "id", label: "Student", type: "search", load: loadStudents, placeholder: "Search student…" },
    { key: "course", label: "Course", type: "search", options: opt("courses"), placeholder: "Search course…" },
    { key: "totalFee", label: "Total fee", type: "numberRange", prefix: "Rs" },
    { key: "paid", label: "Paid", type: "numberRange", prefix: "Rs" },
    { key: "remaining", label: "Remaining", type: "numberRange", prefix: "Rs" },
    { key: "lastPaidOn", label: "Last payment", type: "dateRange" },
    { key: "status", label: "Status", type: "select", options: [{ value: "paid", label: "Paid" }, { value: "partial", label: "Partial" }, { value: "unpaid", label: "Unpaid" }] },
  ]
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["fees/summary"] })
    qc.invalidateQueries({ queryKey: ["fee-history"] })
    qc.invalidateQueries({ queryKey: ["students"] })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
  }

  return (
    <div>
      <PageHeader title="Fees Submission" description="Record fee payments and see who has paid and who is remaining." />
      <Card>
        <ListToolbar {...c.toolbar("Search by student, roll no, phone or course", defs)} />
        {c.list.isLoading ? <PageLoader /> : !c.items.length ? (
          <EmptyState title="No students to show" hint="Add students first (with their total fee), or change the search and filters." />
        ) : (
          <Table head={["Student", "Course", "Total fee", "Paid", "Remaining", "Last payment", "Status", ""]}>
            {c.items.map((s) => (
              <tr key={s._id} className="hover:bg-muted/30">
                <Td><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.rollNo}</p></Td>
                <Td>{s.course || "—"}</Td>
                <Td>{money(s.totalFee)}</Td>
                <Td className="text-emerald-700">{money(s.paid)}</Td>
                <Td className={s.remaining ? "font-medium text-red-600" : ""}>{money(s.remaining)}</Td>
                <Td>{fmtDate(s.lastPaidOn)}</Td>
                <Td><Badge tone={tone[s.feeStatus]}>{label[s.feeStatus]}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setHistory(s)}><History /> History</Button>
                    {can("fees:create") && <Button size="sm" onClick={() => setPaying(s)} disabled={s.feeStatus === "paid"}><Plus /> Payment</Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {c.list.data && <Pagination {...c.pager} />}
      </Card>

      {paying && <PaymentModal student={paying} onClose={() => setPaying(null)} onDone={() => { setPaying(null); refresh() }} />}
      {history && <HistoryModal student={history} onClose={() => setHistory(null)} onChanged={refresh} />}
    </div>
  )
}

function PaymentModal({ student, onClose, onDone }: { student: FeeSummaryRow; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ amount: String(student.remaining || ""), paidOn: new Date().toISOString().slice(0, 10), method: "cash", receiptNo: "", note: "" })
  const validate = (x: typeof f): Errors => {
    const amt = Number(x.amount)
    return {
      amount: x.amount === "" ? "Amount is required"
        : !Number.isFinite(amt) || amt <= 0 ? "Amount must be greater than 0"
        : student.totalFee <= 0 ? "This student has no total fee set. Edit the student first."
        : amt > student.remaining ? `Amount cannot exceed the remaining balance (${money(student.remaining)})` : undefined,
      paidOn: required(x.paidOn, "Date") ?? (x.paidOn > new Date().toISOString().slice(0, 10) ? "Date cannot be in the future" : undefined),
      receiptNo: maxLength(x.receiptNo, 40, "Receipt no"),
      note: maxLength(x.note, 200, "Note"),
    }
  }
  const v = useFormErrors(f, validate)
  const m = useMutation({
    mutationFn: () => api.post("/fees", { ...f, amount: Number(f.amount), student: student._id }),
    onSuccess: () => { toast.success("Payment recorded"); onDone() },
    onError: (e) => toast.error(errMsg(e)),
  })
  return (
    <Modal open onClose={onClose} title={`Record payment — ${student.name}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={m.isPending} onClick={() => v.check() && m.mutate()}>Save payment</Button></>}>
      <p className="mb-4 text-sm text-muted-foreground">Total {money(student.totalFee)} · Paid {money(student.paid)} · Remaining <b className="text-foreground">{money(student.remaining)}</b></p>
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (v.check()) m.mutate() }} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount (Rs) *" error={v.err("amount")}><Input type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} {...v.props("amount")} /></FormField>
        <FormField label="Date *" error={v.err("paidOn")}><Input type="date" max={new Date().toISOString().slice(0, 10)} value={f.paidOn} onChange={(e) => setF({ ...f, paidOn: e.target.value })} {...v.props("paidOn")} /></FormField>
        <FormField label="Method">
          <Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}>
            <option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="online">Online</option><option value="cheque">Cheque</option><option value="other">Other</option>
          </Select>
        </FormField>
        <FormField label="Receipt no" error={v.err("receiptNo")}><Input value={f.receiptNo} onChange={(e) => setF({ ...f, receiptNo: e.target.value })} {...v.props("receiptNo")} /></FormField>
        <FormField label="Note" className="sm:col-span-2" error={v.err("note")}><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} {...v.props("note")} /></FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function HistoryModal({ student, onClose, onChanged }: { student: FeeSummaryRow; onClose: () => void; onChanged: () => void }) {
  const can = useAuth((s) => s.can)
  const [del, setDel] = useState<FeePayment | null>(null)
  const hist = useQuery({
    queryKey: ["fee-history", student._id],
    queryFn: async () => (await api.get<Paged<FeePayment>>("/fees", { params: { student: student._id, limit: 100 } })).data,
  })
  const rm = useMutation({
    mutationFn: (id: string) => api.delete(`/fees/${id}`),
    onSuccess: () => { toast.success("Payment deleted"); setDel(null); hist.refetch(); onChanged() },
    onError: (e) => toast.error(errMsg(e)),
  })
  return (
    <Modal wide open onClose={onClose} title={`Payment history — ${student.name}`} footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
      {hist.isLoading ? <PageLoader /> : !hist.data?.items.length ? <EmptyState title="No payments yet" /> : (
        <Table head={["Date", "Amount", "Method", "Receipt", "Note", ""]}>
          {hist.data.items.map((p) => (
            <tr key={p._id}>
              <Td>{fmtDate(p.paidOn)}</Td><Td className="font-medium">{money(p.amount)}</Td><Td className="capitalize">{p.method}</Td><Td>{p.receiptNo || "—"}</Td><Td>{p.note || "—"}</Td>
              <Td>{can("fees:delete") && <Button variant="ghost" size="icon-sm" className="text-destructive" aria-label="Delete payment" onClick={() => setDel(p)}><Trash2 /></Button>}</Td>
            </tr>
          ))}
        </Table>
      )}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={rm.isPending} title="Delete payment?" message={`Delete the payment of ${del ? money(del.amount) : ""}? The student's balance will be updated.`} onConfirm={() => del && rm.mutate(del._id)} />
    </Modal>
  )
}
