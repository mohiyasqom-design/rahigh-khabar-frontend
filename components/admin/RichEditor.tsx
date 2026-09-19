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
import { useCallback, useState } from "react"

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  const [imageUrl, setImageUrl] = useState("")
  const [videoUrl, setVideoUrl] = useState("")
  const [imageAlt, setImageAlt] = useState("")

  if (!editor) {
    return null
  }

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
        editor.chain().focus().setYoutube({ src: videoUrl }).run()
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

  return (
    <div className="space-y-3 rounded-md border border-border bg-paper p-4">
      {/* Main toolbar */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            editor.isActive("bold")
              ? "bg-accent text-paper"
              : "border border-border text-ink hover:bg-paper/50"
          }`}
        >
          بولد
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            editor.isActive("italic")
              ? "bg-accent text-paper"
              : "border border-border text-ink hover:bg-paper/50"
          }`}
        >
          ایتالیک
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!editor.can().chain().focus().toggleBlockquote().run()}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            editor.isActive("blockquote")
              ? "bg-accent text-paper"
              : "border border-border text-ink hover:bg-paper/50"
          }`}
        >
          نقل‌قول
        </button>

        <div className="h-6 w-px bg-border" />

        <button
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          className="rounded border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-paper/50"
        >
          + جدول
        </button>

        {editor.isActive("table") && (
          <>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Add row"
            >
              +صف
            </button>
            <button
              onClick={() => editor.chain().focus().deleteRow().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Delete row"
            >
              -صف
            </button>
            <button
              onClick={() => editor.chain().focus().addColAfter().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Add column"
            >
              +ستون
            </button>
            <button
              onClick={() => editor.chain().focus().deleteColumn().run()}
              className="rounded border border-border px-2 py-1 text-xs text-ink hover:bg-paper/50"
              title="Delete column"
            >
              -ستون
            </button>
          </>
        )}
      </div>

      {/* Image insertion */}
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
          onClick={insertImage}
          className="rounded border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-paper/50"
        >
          درج تصویر
        </button>
      </div>

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
