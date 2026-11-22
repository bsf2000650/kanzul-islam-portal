import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { Eye, Mail, Phone, Trash2 } from "lucide-react"
import { api, errMsg } from "@/lib/api"
import { useCrud } from "@/lib/useCrud"
import type { Inquiry } from "@/lib/types"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { FormField, PageLoader, Select, Textarea } from "@/components/ui/form"
import { Badge, Card, ConfirmDialog, EmptyState, Modal, PageHeader, Pagination, Table, Td } from "@/components/ui/kit"
import { ListToolbar, type FilterDef } from "@/components/ui/filters"
import { entityLoader, useOptions } from "@/lib/useOptions"
import { maxLength } from "@/lib/validation"

const STATUS = { new: "New", in_progress: "In progress", resolved: "Resolved", closed: "Closed" } as const
const tone = { new: "blue", in_progress: "amber", resolved: "green", closed: "gray" } as const
const loadInquirers = entityLoader<Inquiry>("inquiries", (i) => i.name)
const when = (d: string) => new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export default function Inquiries() {
  const can = useAuth((s) => s.can)
  const c = useCrud<Inquiry>("inquiries")
  const opt = useOptions("inquiries")
  const status = c.filters.status ?? "all"
  const setStatus = (v: string) => c.setFilters({ ...c.filters, status: v === "all" ? "" : v })
  const defs: FilterDef[] = [
    { key: "createdAt", label: "Received", type: "dateRange" },
    { key: "id", label: "Name", type: "search", load: loadInquirers, placeholder: "Search name…" },
    { key: "contact", label: "Contact (phone or email)", type: "text", placeholder: "e.g. 0300 or name@mail.com" },
    { key: "course", label: "Course", type: "select", options: opt("courses") },
    { key: "message", label: "Message contains", type: "text", placeholder: "Words in the message" },
    { key: "status", label: "Status", type: "select", options: Object.entries(STATUS).map(([value, label]) => ({ value, label })) },
  ]
  const stats = useQuery({ queryKey: ["inquiries", "stats"], queryFn: async () => (await api.get<Record<string, number>>("/inquiries/stats")).data })
  const [view, setView] = useState<Inquiry | null>(null)
  const [note, setNote] = useState("")
  const [del, setDel] = useState<Inquiry | null>(null)

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Inquiry> }) => api.patch<Inquiry>(`/inquiries/${id}`, body).then((r) => r.data),
    onSuccess: (r) => { toast.success("Updated"); setView((v) => (v ? { ...v, ...r } : v)); c.invalidate(); stats.refetch() },
    onError: (e) => toast.error(errMsg(e)),
  })
  const openView = (i: Inquiry) => { setView(i); setNote(i.adminNote ?? "") }
  const canEdit = can("inquiries:update")

  return (
    <div>
      <PageHeader title="Students Inquiries" description="Inquiries submitted from the website's contact and quick-inquiry forms." />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => (
          <button key={k} onClick={() => setStatus(status === k ? "all" : k)} className="text-left">
            <Card className={`p-4 transition-colors hover:bg-muted/40 ${status === k ? "ring-2 ring-primary" : ""}`}>
              <p className="text-xs text-muted-foreground">{STATUS[k]}</p>
              <p className="text-2xl font-bold">{stats.data?.[k] ?? 0}</p>
            </Card>
          </button>
        ))}
      </div>
      <Card>
        <ListToolbar {...c.toolbar("Search by name, phone, email, course or message", defs)} />
        {c.list.isLoading ? <PageLoader /> : !c.items.length ? <EmptyState title="No inquiries found" hint="New inquiries from the website will appear here, or change the search and filters." /> : (
          <Table head={["Received", "Name", "Contact", "Course", "Message", "Status", ""]}>
            {c.items.map((i) => (
              <tr key={i._id} className={`hover:bg-muted/30 ${i.status === "new" ? "bg-blue-50/50" : ""}`}>
                <Td className="whitespace-nowrap text-xs">{when(i.createdAt)}</Td>
                <Td className="font-medium">{i.name}</Td>
                <Td><p>{i.phone || "—"}</p><p className="text-xs text-muted-foreground">{i.email}</p></Td>
                <Td>{i.course || "—"}</Td>
                <Td className="max-w-64 truncate text-muted-foreground">{i.message || "—"}</Td>
                <Td><Badge tone={tone[i.status]}>{STATUS[i.status]}</Badge></Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="View" onClick={() => openView(i)}><Eye /></Button>
                    {can("inquiries:delete") && <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-destructive" onClick={() => setDel(i)}><Trash2 /></Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        {c.list.data && <Pagination {...c.pager} />}
      </Card>

      <Modal wide open={!!view} onClose={() => setView(null)} title="Inquiry details" footer={<Button variant="outline" onClick={() => setView(null)}>Close</Button>}>
        {view && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{view.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Received</p><p>{when(view.createdAt)} <span className="text-xs text-muted-foreground">· via {view.source}</span></p></div>
              <div><p className="text-xs text-muted-foreground">Phone</p>{view.phone ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${view.phone}`}><Phone className="size-3.5" />{view.phone}</a> : "—"}</div>
              <div><p className="text-xs text-muted-foreground">Email</p>{view.email ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${view.email}`}><Mail className="size-3.5" />{view.email}</a> : "—"}</div>
              <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Interested course</p><p>{view.course || "—"}</p></div>
            </div>
            <div><p className="mb-1 text-xs text-muted-foreground">Message</p><p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">{view.message || "No message"}</p></div>
            <FormField label="Status">
              <Select value={view.status} disabled={!canEdit} onChange={(e) => patch.mutate({ id: view._id, body: { status: e.target.value as Inquiry["status"] } })} className="max-w-52">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </FormField>
            <FormField label="Internal note (not visible to the student)" error={maxLength(note, 2000, "Note")} hint={`${note.length}/2000`}>
              <Textarea rows={3} value={note} disabled={!canEdit} aria-invalid={note.length > 2000 ? true : undefined} onChange={(e) => setNote(e.target.value)} />
            </FormField>
            {canEdit && <Button size="sm" disabled={patch.isPending || note === (view.adminNote ?? "") || note.length > 2000} onClick={() => patch.mutate({ id: view._id, body: { adminNote: note } })}>Save note</Button>}
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} busy={c.remove.isPending} title="Delete inquiry?" message={<>Delete the inquiry from <b>{del?.name}</b>?</>}
        onConfirm={() => del && c.remove.mutate(del._id, { onSuccess: () => { setDel(null); stats.refetch() } })} />
    </div>
  )
}
