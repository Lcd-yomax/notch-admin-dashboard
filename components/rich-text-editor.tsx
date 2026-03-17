"use client"

import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import TipTapLink from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import {
  IconBold,
  IconItalic,
  IconUnderline,
  IconStrikethrough,
  IconList,
  IconListNumbers,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconLink,
  IconLinkOff,
  IconH1,
  IconH2,
  IconH3,
  IconSeparator,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconClearFormatting,
} from "@tabler/icons-react"
import { Toggle } from "@/components/ui/toggle"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

function ToolbarButton({
  pressed,
  onPressedChange,
  disabled,
  title,
  children,
}: {
  pressed: boolean
  onPressedChange: () => void
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Toggle
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      aria-label={title}
      title={title}
      className="size-8 p-0"
    >
      {children}
    </Toggle>
  )
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const setLink = React.useCallback(() => {
    const previousUrl = editor.getAttributes("link").href
    const url = window.prompt("URL", previousUrl)

    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    // Basic URL validation
    try {
      new URL(url.startsWith("http") ? url : `https://${url}`)
    } catch {
      return
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.startsWith("http") ? url : `https://${url}` })
      .run()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
      {/* Undo/Redo */}
      <ToolbarButton
        pressed={false}
        onPressedChange={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <IconArrowBackUp className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={false}
        onPressedChange={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <IconArrowForwardUp className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Headings */}
      <ToolbarButton
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <IconH1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <IconH2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <IconH3 className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Text formatting */}
      <ToolbarButton
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <IconBold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <IconItalic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <IconUnderline className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <IconStrikethrough className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Lists */}
      <ToolbarButton
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <IconList className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <IconListNumbers className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Alignment */}
      <ToolbarButton
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align Left"
      >
        <IconAlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align Center"
      >
        <IconAlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align Right"
      >
        <IconAlignRight className="size-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Link */}
      <ToolbarButton
        pressed={editor.isActive("link")}
        onPressedChange={setLink}
        title="Add Link"
      >
        <IconLink className="size-4" />
      </ToolbarButton>
      {editor.isActive("link") && (
        <ToolbarButton
          pressed={false}
          onPressedChange={() => editor.chain().focus().unsetLink().run()}
          title="Remove Link"
        >
          <IconLinkOff className="size-4" />
        </ToolbarButton>
      )}

      {/* Horizontal Rule */}
      <ToolbarButton
        pressed={false}
        onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <IconSeparator className="size-4" />
      </ToolbarButton>

      {/* Clear Formatting */}
      <ToolbarButton
        pressed={false}
        onPressedChange={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Clear Formatting"
      >
        <IconClearFormatting className="size-4" />
      </ToolbarButton>
    </div>
  )
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TipTapLink.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none px-3 py-2 min-h-[120px] focus:outline-none",
      },
    },
  })

  if (!editor) return null

  return (
    <div
      className={cn(
        "rounded-md border bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
    >
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
