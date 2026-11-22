import { useRef, useState } from "react"
import { ImagePlus, Link2, Trash2, Upload } from "lucide-react"
import toast from "react-hot-toast"
import { api, assetUrl, errMsg } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input, Spinner } from "@/components/ui/form"

/** Upload an image to the server (or paste a URL). Value is the stored path/URL. */
export function ImageField({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [urlMode, setUrlMode] = useState(false)

  const upload = async (file: File) => {
    const fd = new FormData()
    fd.append("file", file)
    setBusy(true)
    try {
      const { data } = await api.post("/uploads", fd)
      onChange(data.url)
      toast.success("Image uploaded")
    } catch (e) {
      toast.error(errMsg(e, "Upload failed"))
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 ${compact ? "size-20" : "h-28 w-44"}`}
      >
        {value ? <img src={assetUrl(value)} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground/60" />}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-background/70"><Spinner className="size-5" /></div>}
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            <Upload /> {value ? "Replace" : "Upload"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setUrlMode((v) => !v)}><Link2 /> Use URL</Button>
          {value && <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange("")}><Trash2 /> Remove</Button>}
        </div>
        {urlMode && <Input placeholder="https://…" value={value} onChange={(e) => onChange(e.target.value)} />}
        <input
          ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <p className="text-xs text-muted-foreground">JPG, PNG or WEBP, up to 5 MB.</p>
      </div>
    </div>
  )
}
