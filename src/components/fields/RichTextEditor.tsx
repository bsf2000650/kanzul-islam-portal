import { useEffect, useState } from "react"
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyleKit } from "@tiptap/extension-text-style"
import TextAlign from "@tiptap/extension-text-align"
import Highlight from "@tiptap/extension-highlight"
import Placeholder from "@tiptap/extension-placeholder"
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eraser, Highlighter, Italic, Link2, List, ListOrdered,
  Quote, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FormField, Input } from "@/components/ui/form"
import { Modal } from "@/components/ui/kit"

const SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px"]

function Btn({ active, onClick, title, children, disabled }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button" title={title} aria-label={title} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={cn("inline-flex size-7 items-center justify-center rounded-md text-foreground/80 hover:bg-muted disabled:opacity-40", active && "bg-primary/15 text-primary")}
    >
      {children}
    </button>
  )
}
const Sep = () => <span className="mx-1 h-5 w-px bg-border" />

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList"), quote: e.isActive("blockquote"),
      link: e.isActive("link"), highlight: e.isActive("highlight"),
      h1: e.isActive("heading", { level: 1 }), h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }), justify: e.isActive({ textAlign: "justify" }),
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "",
      size: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  })
  const c = () => editor.chain().focus()
  const heading = s.h1 ? "1" : s.h2 ? "2" : s.h3 ? "3" : "0"

  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState("")
  const [linkTouched, setLinkTouched] = useState(false)
  const hadLink = s.link
  const linkError = !href.trim() ? "Enter a link address" : /^(https?:\/\/\S+|mailto:\S+|tel:\S+|\/\S*)$/i.test(href.trim()) ? undefined : "Use a full address like https://example.com, or /page"

  const openLink = () => {
    setHref((editor.getAttributes("link").href as string | undefined) ?? "https://")
    setLinkTouched(false)
    setLinkOpen(true)
  }
  const applyLink = () => {
    setLinkTouched(true)
    if (linkError) return
    setLinkOpen(false)
    c().extendMarkRange("link").setLink({ href: href.trim(), target: "_blank" }).run()
  }
  const removeLink = () => { setLinkOpen(false); c().extendMarkRange("link").unsetLink().run() }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-2 py-1.5">
      <select
        aria-label="Text style" value={heading}
        onChange={(e) => {
          const v = e.target.value
          if (v === "0") c().setParagraph().run()
          else c().setHeading({ level: Number(v) as 1 | 2 | 3 }).run()
        }}
        className="h-7 rounded-md border bg-background px-1.5 text-xs"
      >
        <option value="0">Paragraph</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>
      <select
        aria-label="Font size" value={s.size}
        onChange={(e) => (e.target.value ? c().setFontSize(e.target.value).run() : c().unsetFontSize().run())}
        className="ml-1 h-7 rounded-md border bg-background px-1.5 text-xs"
      >
        <option value="">Size</option>
        {SIZES.map((z) => <option key={z} value={z}>{parseInt(z)}</option>)}
      </select>
      <Sep />
      <Btn title="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="size-4" /></Btn>
      <Btn title="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="size-4" /></Btn>
      <Btn title="Underline" active={s.underline} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="size-4" /></Btn>
      <Btn title="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough className="size-4" /></Btn>
      <Sep />
      <label title="Text color" className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-md hover:bg-muted">
        <span className="text-sm font-bold leading-none" style={{ color: s.color || undefined }}>A</span>
        <span className="absolute bottom-1 h-0.5 w-4 rounded" style={{ background: s.color || "currentColor" }} />
        <input
          type="color" value={s.color || "#000000"} aria-label="Text color"
          onChange={(e) => c().setColor(e.target.value).run()}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Btn title="Highlight" active={s.highlight} onClick={() => c().toggleHighlight({ color: "#fde68a" }).run()}><Highlighter className="size-4" /></Btn>
      <Sep />
      <Btn title="Align left" active={s.left} onClick={() => c().setTextAlign("left").run()}><AlignLeft className="size-4" /></Btn>
      <Btn title="Align center" active={s.center} onClick={() => c().setTextAlign("center").run()}><AlignCenter className="size-4" /></Btn>
      <Btn title="Align right" active={s.right} onClick={() => c().setTextAlign("right").run()}><AlignRight className="size-4" /></Btn>
      <Btn title="Justify" active={s.justify} onClick={() => c().setTextAlign("justify").run()}><AlignJustify className="size-4" /></Btn>
      <Sep />
      <Btn title="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List className="size-4" /></Btn>
      <Btn title="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
      <Btn title="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className="size-4" /></Btn>
      <Btn title="Link" active={s.link} onClick={openLink}><Link2 className="size-4" /></Btn>
      <Modal
        open={linkOpen} onClose={() => setLinkOpen(false)} title={hadLink ? "Edit link" : "Add link"}
        footer={<>
          {hadLink && <Button variant="ghost" className="mr-auto text-destructive" onClick={removeLink}>Remove link</Button>}
          <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
          <Button onClick={applyLink}>{hadLink ? "Update link" : "Add link"}</Button>
        </>}
      >
        <form noValidate onSubmit={(e) => { e.preventDefault(); applyLink() }}>
          <FormField label="Link address *" error={linkTouched ? linkError : undefined} hint="Applies to the text you selected.">
            <Input autoFocus value={href} onChange={(e) => setHref(e.target.value)} onBlur={() => setLinkTouched(true)} aria-invalid={linkTouched && linkError ? true : undefined} placeholder="https://example.com" />
          </FormField>
          <button type="submit" hidden />
        </form>
      </Modal>
      <Sep />
      <Btn title="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}><Eraser className="size-4" /></Btn>
      <Btn title="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className="size-4" /></Btn>
      <Btn title="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className="size-4" /></Btn>
    </div>
  )
}

/** Word-style rich text editor. Value is an HTML string. */
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TextStyleKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
    ],
    content: value || "",
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
    editorProps: { attributes: { class: "rt-content min-h-32 px-3 py-2.5 outline-none" } },
  })

  // Keep the editor in sync when the value is replaced from outside (reset / reload).
  useEffect(() => {
    if (editor && value !== (editor.isEmpty ? "" : editor.getHTML())) editor.commands.setContent(value || "", { emitUpdate: false })
  }, [value, editor])

  if (!editor) return null
  return (
    <div className="overflow-hidden rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
