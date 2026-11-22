import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import { RotateCcw, Save, Undo2 } from "lucide-react"
import { api, errMsg } from "@/lib/api"
import type { Content, PageDef } from "@/lib/types"
import { useAuth } from "@/store/auth"
import { Button } from "@/components/ui/button"
import { PageLoader, Spinner } from "@/components/ui/form"
import { Card, ConfirmDialog, PageHeader } from "@/components/ui/kit"
import { FieldGroup } from "@/components/fields/FieldRenderer"
import { ValidationContext, validateContent } from "@/lib/contentValidation"

type Payload = { def: PageDef; content: Content; updatedAt: string }

export default function PageEditorRoute() {
  const { key = "common" } = useParams()
  return <PageEditor key={key} pageKey={key} /> // remount per page so drafts never leak across pages
}

function PageEditor({ pageKey }: { pageKey: string }) {
  const qc = useQueryClient()
  const canEdit = useAuth((s) => s.can("pages:update"))
  const { data, isLoading, error } = useQuery({
    queryKey: ["page", pageKey],
    queryFn: async () => (await api.get<Payload>(`/pages/${pageKey}`)).data,
  })

  const [draft, setDraft] = useState<Content | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [touched, setTouched] = useState<Set<string>>(new Set())
  const touch = useCallback((p: string) => setTouched((t) => (t.has(p) ? t : new Set(t).add(p))), [])
  useEffect(() => { if (data) setDraft(structuredClone(data.content)) }, [data])

  const errors = useMemo(() => (data && draft ? validateContent(data.def.sections, draft) : {}), [data, draft])
  const errorCount = Object.keys(errors).length
  const sectionErrors = (key: string) => Object.keys(errors).filter((k) => k.startsWith(key + ".")).length

  const trySave = () => {
    if (errorCount) {
      setShowErrors(true)
      toast.error(`Please fix ${errorCount} highlighted field${errorCount === 1 ? "" : "s"} before saving`)
      // jump to the first problem once the errors have rendered
      setTimeout(() => document.querySelector('[role="alert"], [aria-invalid="true"]')?.scrollIntoView({ behavior: "smooth", block: "center" }), 60)
      return
    }
    save.mutate()
  }

  const dirty = useMemo(() => !!data && !!draft && JSON.stringify(draft) !== JSON.stringify(data.content), [data, draft])

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", h)
    return () => window.removeEventListener("beforeunload", h)
  }, [dirty])

  const onSaved = (r: { content: Content; updatedAt: string }, msg: string) => {
    qc.setQueryData<Payload>(["page", pageKey], (old) => (old ? { ...old, ...r } : old))
    qc.invalidateQueries({ queryKey: ["pages"] })
    toast.success(msg)
  }
  const save = useMutation({
    mutationFn: async () => (await api.put(`/pages/${pageKey}`, { content: draft })).data,
    onSuccess: (r) => onSaved(r, "Changes saved. Your website is updated."),
    onError: (e) => toast.error(errMsg(e)),
  })
  const reset = useMutation({
    mutationFn: async () => (await api.post(`/pages/${pageKey}/reset`)).data,
    onSuccess: (r) => { setConfirmReset(false); onSaved(r, "Page restored to the original content") },
    onError: (e) => toast.error(errMsg(e)),
  })

  if (isLoading || !draft || !data) return error ? <p className="text-destructive">{errMsg(error)}</p> : <PageLoader />
  const { def } = data

  return (
    <div>
      <PageHeader
        title={`${def.title} Page`}
        description={def.description}
        actions={canEdit && <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}><RotateCcw /> Restore original</Button>}
      />

      <div className="flex items-start gap-6">
        <ValidationContext.Provider value={{ errors, show: showErrors, touched, touch }}>
        <div className="min-w-0 flex-1 space-y-6 pb-24">
          {!canEdit && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">You have view-only access to pages.</p>}
          {def.sections.map((s, i) => (
            <Card key={s.key} id={`sec-${s.key}`} className="scroll-mt-24 overflow-hidden">
              <div className="border-b bg-muted/40 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <span className="text-muted-foreground">{i + 1}.</span>{s.title}
                  {showErrors && sectionErrors(s.key) > 0 && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">{sectionErrors(s.key)} to fix</span>}
                </h2>
                {s.description && <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>}
              </div>
              <fieldset disabled={!canEdit} className="p-5">
                <FieldGroup
                  path={s.key}
                  fields={s.fields}
                  value={draft[s.key] ?? {}}
                  onChange={(v) => setDraft({ ...draft, [s.key]: v })}
                />
              </fieldset>
            </Card>
          ))}
        </div>
        </ValidationContext.Provider>

        <aside className="sticky top-24 hidden w-52 shrink-0 xl:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">On this page</p>
          <ul className="space-y-1 border-l">
            {def.sections.map((s) => (
              <li key={s.key}>
                <a href={`#sec-${s.key}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" }) }}
                  className="-ml-px block border-l border-transparent px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {canEdit && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <p className={`text-sm ${showErrors && errorCount ? "font-medium text-destructive" : "text-muted-foreground"}`}>{showErrors && errorCount ? `${errorCount} field${errorCount === 1 ? "" : "s"} need attention` : dirty ? "You have unsaved changes" : "All changes saved"}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!dirty} onClick={() => setDraft(structuredClone(data.content))}><Undo2 /> Discard</Button>
              <Button disabled={!dirty || save.isPending} onClick={trySave}>{save.isPending ? <Spinner /> : <Save />} Save changes</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset} onClose={() => setConfirmReset(false)} busy={reset.isPending}
        title="Restore original content?" confirmLabel="Restore"
        message={`This replaces everything on the “${def.title}” page with the original content. Your edits to this page will be lost.`}
        onConfirm={() => reset.mutate()}
      />
    </div>
  )
}
