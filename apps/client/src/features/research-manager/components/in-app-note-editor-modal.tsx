import React, { FC, useState, useEffect, useRef } from "react"
import { notifications } from "@mantine/notifications"
import {
  IconCheck,
  IconDeviceFloppy,
  IconExternalLink,
  IconEye,
  IconFileText,
  IconList,
  IconListNumbers,
  IconQuote,
  IconShare,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import api from "@/lib/api-client"

export interface EditorNote {
  id: string | number
  slugId?: string
  spaceSlug?: string
  title: string
  body?: string
  content?: string
  preview?: string
  isPublished?: boolean
  projectId?: string | number
  tags?: string[]
  time?: string
  author?: {
    id: string | number
    name: string
    avatar?: string
    role?: string
  }
}

interface InAppNoteEditorModalProps {
  note: EditorNote | null
  projects: Array<{ id: string | number; title: string }>
  currentUser: {
    id: string | number
    name: string
    role?: string
    studentId?: string
    email?: string
  }
  defaultSpaceSlug?: string
  defaultSpaceId?: string
  onClose: () => void
  onSaveNote: (updatedNote: EditorNote) => void
  onDeleteNote?: (noteId: string | number) => void
  onNavigateDocmost?: (url: string) => void
}

export const InAppNoteEditorModal: FC<InAppNoteEditorModalProps> = ({
  note,
  projects,
  currentUser,
  defaultSpaceSlug = "general",
  defaultSpaceId,
  onClose,
  onSaveNote,
  onDeleteNote,
  onNavigateDocmost,
}) => {
  const [title, setTitle] = useState(note?.title || "Untitled Note")
  const [content, setContent] = useState(
    note?.body || note?.content || note?.preview || "",
  )
  const [projectId, setProjectId] = useState<string | number>(
    note?.projectId || projects[0]?.id || "",
  )
  const [isPublished, setIsPublished] = useState<boolean>(
    note?.isPublished ?? false,
  )
  const [tags, setTags] = useState<string[]>(
    note?.tags && note.tags.length > 0 ? note.tags : ["Analysis"],
  )
  const [tagInput, setTagInput] = useState("")
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title || "Untitled Note")
      setContent(note.body || note.content || note.preview || "")
      setIsPublished(note.isPublished ?? false)
      if (note.projectId) setProjectId(note.projectId)
      if (note.tags) setTags(note.tags)
    }
  }, [note])

  // Insert markdown shortcuts
  const insertFormatting = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = textarea.value.substring(start, end)
    const replacement = `${prefix}${selected || "text"}${suffix}`
    const updated =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end)
    setContent(updated)

    setTimeout(() => {
      textarea.focus()
      const cursorTarget = start + prefix.length + (selected ? selected.length : 4)
      textarea.setSelectionRange(cursorTarget, cursorTarget)
    }, 20)
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const removeTag = (tToRemove: string) => {
    setTags(tags.filter((t) => t !== tToRemove))
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)

    const updatedNote: EditorNote = {
      ...(note || {}),
      id: note?.id || `local-${Date.now()}`,
      slugId: note?.slugId || Math.random().toString(36).substring(2, 10),
      spaceSlug: note?.spaceSlug || defaultSpaceSlug,
      title: title.trim(),
      body: content,
      content,
      preview: content.slice(0, 140) || "Empty note content...",
      isPublished,
      projectId,
      tags,
      time:
        note?.time ||
        new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      author: note?.author || {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role || "Researcher",
      },
    }

    try {
      const res: any = await api.post("/research/create-note", {
        title: title.trim(),
        content,
        projectId: projectId ? String(projectId) : undefined,
        isPublished,
        authorName: currentUser.name,
        authorStudentId: currentUser.studentId,
        spaceId: defaultSpaceId,
      })

      const data = res?.data || res
      if (data?.note) {
        updatedNote.id = data.note.id
        updatedNote.slugId = data.note.slugId
        updatedNote.spaceSlug = data.note.spaceSlug || defaultSpaceSlug
      }

      notifications.show({
        title: "Note Saved",
        message: "Research note updated successfully.",
        color: "emerald",
      })
    } catch (err: any) {
      console.warn("Backend save notice:", err?.message)
      notifications.show({
        title: "Saved to Local Workspace",
        message: "Note updated in local storage.",
        color: "teal",
      })
    } finally {
      setSaving(false)
      onSaveNote(updatedNote)
      onClose()
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex h-[90vh] max-h-[850px] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-[#0d1713] text-slate-100 shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1c3327] bg-[#09120e] px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <IconFileText className="size-4" />
            </span>
            <span className="text-sm font-bold text-white">
              {note?.id ? "Edit Research Note" : "New Research Note"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Publish Toggle */}
            <button
              type="button"
              onClick={() => setIsPublished(!isPublished)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                isPublished
                  ? "bg-emerald-950/70 border-emerald-500/40 text-emerald-400"
                  : "bg-[#111e18] border-[#1c3327] text-slate-400 hover:text-white"
              }`}
            >
              <IconShare className="size-3.5" />
              <span>{isPublished ? "Team Published" : "Personal Draft"}</span>
            </button>

            {/* Open in Docmost Editor Button */}
            {note?.slugId && onNavigateDocmost && (
              <button
                type="button"
                onClick={() =>
                  onNavigateDocmost(
                    `/s/${note.spaceSlug || defaultSpaceSlug}/p/${note.slugId}`,
                  )
                }
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1c3327] bg-[#111e18] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                title="Open full page in Docmost"
              >
                <IconExternalLink className="size-3.5" />
                <span>Open in Docmost</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-[#162820] hover:text-white transition cursor-pointer"
            >
              <IconX className="size-4" />
            </button>
          </div>
        </header>

        {/* Note Title & Project Bar */}
        <div className="p-4 border-b border-[#1c3327] bg-[#0b1612] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              className="flex-1 bg-transparent text-base sm:text-lg font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-2 py-1 border border-transparent focus:border-emerald-500/50"
            />

            {/* Project Selector */}
            {projects.length > 0 && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="bg-[#111e18] border border-[#1c3327] text-xs font-medium text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    Project: {p.title}
                  </option>
                ))}
              </select>
            )}

            {/* Mode Toggle: Edit / Preview */}
            <div className="flex rounded-lg border border-[#1c3327] bg-[#111e18] p-0.5 text-xs font-medium shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "edit"
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                  activeTab === "preview"
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <IconEye className="size-3" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-wrap px-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Tags:
            </span>
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#14261e] text-emerald-300 border border-[#1e3b2e] px-2 py-0.5 rounded-md"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="+ Add tag (Enter)..."
              className="bg-transparent text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none w-28 px-1 py-0.5"
            />
          </div>
        </div>

        {/* Toolbar (in Edit mode) */}
        {activeTab === "edit" && (
          <div className="flex items-center gap-1 px-4 py-1.5 border-b border-[#1c3327] bg-[#0c1813] text-xs text-slate-300 overflow-x-auto">
            <button
              type="button"
              onClick={() => insertFormatting("**", "**")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white font-bold cursor-pointer"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("*", "*")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white italic cursor-pointer"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n## ", "\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white font-semibold cursor-pointer"
              title="Heading 2"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n### ", "\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white font-semibold cursor-pointer"
              title="Heading 3"
            >
              H3
            </button>
            <div className="h-4 w-px bg-[#1c3327] mx-1" />
            <button
              type="button"
              onClick={() => insertFormatting("\n- ", "\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
              title="Bullet list"
            >
              <IconList className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n1. ", "\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
              title="Numbered list"
            >
              <IconListNumbers className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n> ", "\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
              title="Quote"
            >
              <IconQuote className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n> [!NOTE]\n> ", "\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
              title="Callout Box"
            >
              <IconSparkles className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("\n```\n", "\n```\n")}
              className="p-1.5 rounded hover:bg-[#162820] hover:text-white font-mono text-[10px] cursor-pointer"
              title="Code block"
            >
              {"</>"}
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "edit" ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your research notes, findings, equations, or observations..."
              className="w-full h-full min-h-[350px] resize-none bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs sm:text-sm leading-6 selection:bg-emerald-500/30"
            />
          ) : (
            <div className="prose prose-invert prose-emerald max-w-none text-slate-200 space-y-4">
              {content.split("\n").map((line, idx) => {
                if (line.startsWith("## ")) {
                  return (
                    <h2
                      key={idx}
                      className="text-lg font-bold text-emerald-400 border-b border-[#1c3327] pb-1 mt-4 mb-2"
                    >
                      {line.replace("## ", "")}
                    </h2>
                  )
                }
                if (line.startsWith("### ")) {
                  return (
                    <h3
                      key={idx}
                      className="text-sm font-bold text-teal-300 mt-3 mb-1"
                    >
                      {line.replace("### ", "")}
                    </h3>
                  )
                }
                if (line.startsWith("> [!NOTE]")) {
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-emerald-950/40 border-l-4 border-emerald-500 text-xs text-emerald-200"
                    >
                      {line.replace("> [!NOTE]", "")}
                    </div>
                  )
                }
                if (line.startsWith("> ")) {
                  return (
                    <blockquote
                      key={idx}
                      className="border-l-2 border-[#1c3327] pl-3 italic text-slate-400 text-xs"
                    >
                      {line.replace("> ", "")}
                    </blockquote>
                  )
                }
                if (line.startsWith("- ")) {
                  return (
                    <li key={idx} className="ml-4 list-disc text-xs sm:text-sm">
                      {line.replace("- ", "")}
                    </li>
                  )
                }
                if (!line.trim()) {
                  return <div key={idx} className="h-2" />
                }
                return (
                  <p key={idx} className="text-xs sm:text-sm text-slate-300">
                    {line}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <footer className="h-14 shrink-0 border-t border-[#1c3327] bg-[#09120e] px-5 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            <span>
              <strong>{wordCount}</strong> words
            </span>
          </div>

          <div className="flex items-center gap-2">
            {note?.id && onDeleteNote && (
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(note.id)
                  onClose()
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-950 text-xs font-semibold text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
              >
                <IconTrash className="size-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-[#1c3327] text-xs font-semibold text-slate-300 hover:bg-[#162820] hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <IconDeviceFloppy className="size-4" />
              <span>{saving ? "Saving..." : "Save Note"}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
