"use client"

// Tiptap is a browser editor: it calls useEditor/useState and touches the DOM.
// Without this directive Next.js compiles the module as a Server Component and
// the whole admin editor route fails to build.
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Table from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
import Image from "@tiptap/extension-image"
import Youtube from "@tiptap/extension-youtube"
import Blockquote from "@tiptap/extension-blockquote"
import TextStyle from "@tiptap/extension-text-style"
import FontFamily from "@tiptap/extension-font-family"
import Link from "@tiptap/extension-link"
import { useRef, useState, type ChangeEvent } from "react"

import { EDITOR_FONTS, EDITOR_FONT_SIZES, isSafeLinkUrl } from "@/components/admin/editor-fonts"
import { FontSize } from "@/components/admin/extensions/FontSize"
import { errorMessage } from "@/lib/errors"
import { maxUploadSizeBytes } from "@/lib/media"
import { uploadEditorImage } from "@/lib/media-upload"

/**
 * GROUP 1 ADDITIONS TO THE TOOLBAR
 *   - font family (وزیرمتن / شبنم / پیدا) and font size (fixed px list), both
 *     applied to the SELECTED text only via the `textStyle` mark; disabled
 *     while nothing is selected;
 *   - link: select text -> «لینک» -> URL -> apply. Only absolute http(s) and
 *     mailto URLs are accepted (the backend sanitizer enforces the same rule);
 *   - «آپلود تصویر»: picks a file from the device, uploads it through the
 *     editor-upload route (same magic-byte/UUID/atomic pipeline as covers) and
 *     inserts it at the cursor position captured before the upload started;
 *   - «حذف جدول»: `deleteTable` from @tiptap/extension-table, enabled only
 *     while the cursor is inside a table.
 *
 * Every toolbar control is `type="button"`: the editor lives inside the news
 * <form>, and a default (submit) button would save the article on each click.
 *
 * RESPONSIVE: rows use `flex-wrap`, so the longer toolbar wraps on small
 * screens instead of overflowing.
 */

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"]
// Group 3: .jpg/.jpeg with an empty or odd MIME type from the OS.
const ACCEPTED_IMAGE_INPUT_VALUE = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"

const buttonBase =
  "rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
const buttonIdle = "border border-border text-ink hover:bg-paper/50"
const buttonActive = "bg-accent text-paper"

function toggleClass(active: boolean): string {
  return `${buttonBase} ${active ? buttonActive : buttonIdle}`
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [imageUrl, setImageUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [imageAlt, setImageAlt] = useState("")
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!editor) {
    return null
  }

  const hasSelection = !editor.state.selection.empty
  const inLink = editor.isActive("link")
  const textStyle = editor.getAttributes("textStyle") as {
    fontFamily?: string | null
    fontSize?: string | null
  }
  const currentFont = textStyle.fontFamily ?? ""
  const currentSize = textStyle.fontSize ?? ""

  const insertImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl, alt: imageAlt }).run()
      setImageUrl("")
      setImageAlt("")
    }
  }

  const insertVideo = () => {
    if (videoUrl) {
      // Support YouTube and Aparat
      if (videoUrl.includes("youtube") || videoUrl.includes("youtu.be")) {
        editor.chain().focus().setYoutubeVideo({ src: videoUrl }).run()
      } else {
        // Generic iframe for other providers (Aparat, etc)
        editor
          .chain()
          .focus()
          .insertContent({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: " ",
              },
            ],
          })
          .insertContent({
            type: "iframe",
            attrs: { src: videoUrl },
          })
          .run()
      }
      setVideoUrl("")
    }
  }

  /* ---------------------------- font / size ---------------------------- */

  const applyFont = (value: string) => {
    if (!hasSelection) return
    if (value) {
      editor.chain().focus().setFontFamily(value).run()
    } else {
      editor.chain().focus().unsetFontFamily().run()
    }
  }

  const applySize = (value: string) => {
    if (!hasSelection) return
    if (value) {
      editor.chain().focus().setFontSize(value).run()
    } else {
      editor.chain().focus().unsetFontSize().run()
    }
  }

  /* -------------------------------- link ------------------------------- */

  const openLinkForm = () => {
    const existing = editor.getAttributes("link") as { href?: string | null }
    setLinkUrl(existing.href ?? "")
    setLinkError(null)
    setLinkOpen((open) => !open)
  }

  const applyLink = () => {
    const url = linkUrl.trim()

    if (!isSafeLinkUrl(url)) {
      setLinkError("نشانی معتبر نیست. فقط نشانی‌های کامل http:// یا https:// یا mailto: پذیرفته می‌شوند.")
      return
    }

    // Editing an existing link: widen the selection to the whole link first.
    const chain = editor.chain().focus()
    if (inLink) chain.extendMarkRange("link")
    chain.setLink({ href: url, target: "_blank", rel: "noopener noreferrer nofollow" }).run()

    setLinkOpen(false)
    setLinkUrl("")
    setLinkError(null)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    setLinkOpen(false)
    setLinkUrl("")
    setLinkError(null)
  }

  /* ---------------------------- image upload --------------------------- */

  const pickFile = () => {
    setUploadError(null)
    fileInputRef.current?.click()
  }

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Reset so choosing the same file again still fires `change`.
    input.value = ""

    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase()) && !(file.type === "" && /\.(jpe?g|png|webp)$/i.test(file.name))) {
      setUploadError("فقط تصویر JPEG، PNG یا WebP قابل آپلود است.")
      return
    }

    const limit = maxUploadSizeBytes()
    if (file.size > limit) {
      setUploadError(`حجم تصویر بیش از حد مجاز است (حداکثر ${Math.floor(limit / 1024 / 1024)} مگابایت).`)
      return
    }

    // Remember where the cursor was: the editor may lose focus while the
    // upload runs, and the image must land exactly where the editor was typing.
    const insertAt = editor.state.selection.from

    setUploading(true)
    setUploadError(null)

    try {
      // The server re-validates the real bytes (magic numbers), so a renamed
      // executable is rejected there even if the browser reports image/png.
      const media = await uploadEditorImage(file, imageAlt)
      const position = Math.min(insertAt, editor.state.doc.content.size)

      editor
        .chain()
        .focus()
        .insertContentAt(position, {
          type: "image",
          attrs: { src: media.url, alt: media.altText ?? imageAlt },
        })
        .run()

      setImageAlt("")
    } catch (caught) {
      setUploadError(errorMessage(caught, "آپلود تصویر انجام نشد."))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-paper p-4">
      {/* Main toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={toggleClass(editor.isActive("bold"))}
        >
          بولد
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={toggleClass(editor.isActive("italic"))}
        >
          ایتالیک
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          className={toggleClass(editor.isActive("blockquote"))}
        >
          نقل‌قول
        </button>

        <div className="h-6 w-px bg-border" />

        {/* Group 1: font family, selection only */}
        <label className="flex items-center gap-1 text-xs text-muted-dark">
          <span className="sr-only sm:not-sr-only">فونت</span>
          <select
            value={currentFont}
            disabled={!hasSelection}
            onChange={(event) => applyFont(event.target.value)}
            title={hasSelection ? "فونت متن انتخاب‌شده" : "ابتدا بخشی از متن را انتخاب کنید"}
            className="rounded border border-border bg-white px-2 py-1.5 text-xs text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <option value="">پیش‌فرض</option>
            {EDITOR_FONTS.map((font) => (
              <option key={font.value} value={font.value} title={font.hint}>
                {font.label}
              </option>
            ))}
          </select>
        </label>

        {/* Group 1: font size, selection only */}
        <label className="flex items-center gap-1 text-xs text-muted-dark">
          <span className="sr-only sm:not-sr-only">اندازه</span>
          <select
            value={currentSize}
            disabled={!hasSelection}
            onChange={(event) => applySize(event.target.value)}
            title={hasSelection ? "اندازهٔ متن انتخاب‌شده" : "ابتدا بخشی از متن را انتخاب کنید"}
            className="rounded border border-border bg-white px-2 py-1.5 text-xs text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <option value="">پیش‌فرض</option>
            {EDITOR_FONT_SIZES.map((size) => (
              <option key={size} value={`${size}px`}>
                {size.toLocaleString("fa-IR")} px
              </option>
            ))}
          </select>
        </label>

        {/* Group 1: link */}
        <button
          type="button"
          onClick={openLinkForm}
          disabled={!hasSelection && !inLink}
          aria-expanded={linkOpen}
          title={hasSelection || inLink ? "لینک‌دار کردن متن انتخاب‌شده" : "ابتدا بخشی از متن را انتخاب کنید"}
          className={toggleClass(inLink)}
        >
          لینک
        </button>

        <div className="h-6 w-px bg-border" />

        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className={`${buttonBase} ${buttonIdle}`}
        >
          + جدول
        </button>

        {editor.isActive("table") && (
          <>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Add row"
            >
              +صف
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Delete row"
            >
              -صف
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Add column"
            >
              +ستون
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Delete column"
            >
              -ستون
            </button>
          </>
        )}

        {/* Group 1: the missing way out of a table. Always visible so it is
            discoverable, but only enabled while the cursor is inside one. */}
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
          title="حذف کامل جدولی که کرسر داخل آن است"
          className={`${buttonBase} border border-accent/40 text-accent hover:bg-accent/5`}
        >
          حذف جدول
        </button>
      </div>

      {linkOpen ? (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              dir="ltr"
              autoFocus
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value)
                setLinkError(null)
              }}
              onKeyDown={(e) => {
                // Enter must apply the link, not submit the whole news form.
                if (e.key === "Enter") {
                  e.preventDefault()
                  applyLink()
                }
                if (e.key === "Escape") {
                  e.preventDefault()
                  setLinkOpen(false)
                }
              }}
              className="flex-1 rounded border border-border px-2 py-1 text-start text-xs text-ink placeholder:text-muted"
            />
            <button type="button" onClick={applyLink} className={`${buttonBase} ${buttonActive}`}>
              اعمال لینک
            </button>
            {inLink ? (
              <button type="button" onClick={removeLink} className={`${buttonBase} ${buttonIdle}`}>
                حذف لینک
              </button>
            ) : null}
          </div>
          {linkError ? <p className="text-xs text-accent">{linkError}</p> : null}
        </div>
      ) : null}

      {/* Image insertion: by URL, or (Group 1) uploaded from the device */}
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          placeholder="لینک تصویر..."
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="flex-1 rounded border border-border px-2 py-1 text-xs text-ink placeholder:text-muted"
        />
        <input
          type="text"
          placeholder="توصیف تصویر (اختیاری)..."
          value={imageAlt}
          onChange={(e) => setImageAlt(e.target.value)}
          className="flex-1 rounded border border-border px-2 py-1 text-xs text-ink placeholder:text-muted"
        />
        <button
          type="button"
          onClick={insertImage}
          className="rounded border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-paper/50"
        >
          درج تصویر
        </button>
        <button
          type="button"
          onClick={pickFile}
          disabled={uploading}
          aria-busy={uploading}
          className={`${buttonBase} ${buttonIdle} inline-flex items-center gap-1.5`}
        >
          {uploading ? (
            <>
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              در حال آپلود…
            </>
          ) : (
            "آپلود تصویر"
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_INPUT_VALUE}
          className="hidden"
          onChange={(event) => void handleFile(event)}
        />
      </div>
      {uploadError ? (
        <p role="alert" className="text-xs text-accent">
          {uploadError}
        </p>
      ) : null}

      {/* Video insertion */}
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          placeholder="لینک ویدیو (YouTube/Aparat)..."
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          className="flex-1 rounded border border-border px-2 py-1 text-xs text-ink placeholder:text-muted"
        />
        <button
          type="button"
          onClick={insertVideo}
          className="rounded border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-paper/50"
        >
          درج ویدیو
        </button>
      </div>
    </div>
  )
}

export default function RichEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: false,
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
      Blockquote,
      // Group 1: typography + links.
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize.configure({ types: ["textStyle"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
        // Pasted/auto-detected links obey the same scheme rule as the dialog.
        validate: (href: string) => isSafeLinkUrl(href),
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  return (
    <div className="space-y-3">
      <MenuBar editor={editor} />
      <div className="news-body max-w-none rounded-md border border-border bg-white p-4">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
