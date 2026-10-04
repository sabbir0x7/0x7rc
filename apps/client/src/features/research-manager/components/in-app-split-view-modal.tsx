import React, { FC, useState, useEffect, useRef, useCallback } from "react"
import { notifications } from "@mantine/notifications"
import {
  IconArrowLeft,
  IconCheck,
  IconDeviceFloppy,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconFileText,
  IconList,
  IconListNumbers,
  IconMinus,
  IconPlus,
  IconQuote,
  IconRefresh,
  IconShare,
  IconSparkles,
  IconX,
} from "@tabler/icons-react"
import api from "@/lib/api-client"

export interface SplitPaper {
  id: number | string
  title: string
  authors: string
  source: string
  year: number | string
  url: string
  pdfDataUrl?: string
  abstract?: string
  fileSize?: string
  projectId?: number | string
}

interface InAppSplitViewModalProps {
  paper: SplitPaper
  projectTitle?: string
  projectId?: number | string
  currentUser: {
    id: number | string
    name: string
    role?: string
    studentId?: string
    email?: string
  }
  defaultSpaceSlug?: string
  defaultSpaceId?: string
  onClose: () => void
  onSaveNoteSuccess?: (note: any) => void
  onNavigateDocmost?: (url: string) => void
}

export const InAppSplitViewModal: FC<InAppSplitViewModalProps> = ({
  paper,
  projectTitle = "General Research",
  projectId,
  currentUser,
  defaultSpaceSlug = "general",
  defaultSpaceId,
  onClose,
  onSaveNoteSuccess,
  onNavigateDocmost,
}) => {
  // Resolve direct PDF URL (handling arXiv abstract to pdf conversion)
  const resolvedPdfUrl = (() => {
    let raw = paper.pdfDataUrl || paper.url || ""
    if (raw.includes("arxiv.org/abs/")) {
      raw = raw.replace("arxiv.org/abs/", "arxiv.org/pdf/") + ".pdf"
    }
    return raw
  })()

  // Layout states
  const [splitRatio, setSplitRatio] = useState<number>(52) // 52% PDF, 48% Notes
  const [zoom, setZoom] = useState<number>(100)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  // Note states
  const [noteTitle, setNoteTitle] = useState<string>(() => {
    try {
      const savedDraft = localStorage.getItem(`0x7_split_note_${paper.id}`)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed.title) return parsed.title
      }
    } catch {}
    return `Notes: ${paper.title}`
  })

  const [noteContent, setNoteContent] = useState<string>(() => {
    try {
      const savedDraft = localStorage.getItem(`0x7_split_note_${paper.id}`)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed.content) return parsed.content
      }
    } catch {}
    return `## Literature Synthesis & Key Observations\n\n**Paper:** ${paper.title}\n**Authors:** ${paper.authors}\n**Source:** ${paper.source} (${paper.year})\n\n### 1. Research Question & Hypothesis\n- \n\n### 2. Core Methodology\n- \n\n### 3. Empirical Results & Comparative Metrics\n- \n\n### 4. Critical Strengths & Limitations\n- \n\n### 5. Application to our Project (${projectTitle})\n- \n`
  })

  const [isPublished, setIsPublished] = useState<boolean>(false)
  const [tags, setTags] = useState<string[]>(["Paper Review", "Analysis"])
  const [tagInput, setTagInput] = useState<string>("")
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [createdNoteSlugId, setCreatedNoteSlugId] = useState<string>("")

  const containerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isDraggingRef = useRef<boolean>(false)

  // Auto-save draft to localStorage whenever content or title changes
  useEffect(() => {
    try {
      localStorage.setItem(
        `0x7_split_note_${paper.id}`,
        JSON.stringify({
          title: noteTitle,
          content: noteContent,
          isPublished,
          tags,
          updatedAt: new Date().toISOString(),
        }),
      )
    } catch {}
    setSaveStatus("unsaved")
  }, [noteTitle, noteContent, isPublished, tags, paper.id])

  // Periodic autosave to database
  useEffect(() => {
    const timer = setTimeout(() => {
      if (saveStatus === "unsaved") {
        handleSaveNote(true)
      }
    }, 4000)
    return () => clearTimeout(timer)
  }, [saveStatus, noteTitle, noteContent])

  // Splitter drag handling with pointer events
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const currentX = moveEvent.clientX - rect.left
      const newRatio = Math.max(25, Math.min(80, (currentX / rect.width) * 100))
      setSplitRatio(newRatio)
    }

    const onPointerUp = () => {
      isDraggingRef.current = false
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
  }

  // Insert markdown shortcuts into textarea
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
    setNoteContent(updated)
    setSaveStatus("unsaved")

    setTimeout(() => {
      textarea.focus()
      const cursorTarget = start + prefix.length + (selected ? selected.length : 4)
      textarea.setSelectionRange(cursorTarget, cursorTarget)
    }, 20)
  }

  // Save Note to Database and Local Storage
  const handleSaveNote = async (isAutosave = false) => {
    if (!noteTitle.trim()) return
    setSaveStatus("saving")

    const notePayload = {
      title: noteTitle.trim(),
      content: noteContent,
      projectId: projectId ? String(projectId) : undefined,
      isPublished,
      authorName: currentUser.name,
      authorStudentId: currentUser.studentId,
      spaceId: defaultSpaceId,
    }

    try {
      const res: any = await api.post("/research/create-note", notePayload)
      const data = res?.data || res
      if (data?.note?.slugId) {
        setCreatedNoteSlugId(data.note.slugId)
      }
      setSaveStatus("saved")

      // Notify parent app
      if (onSaveNoteSuccess) {
        onSaveNoteSuccess({
          id: data?.note?.id || `local-${Date.now()}`,
          slugId: data?.note?.slugId || createdNoteSlugId,
          title: noteTitle,
          spaceSlug: data?.note?.spaceSlug || defaultSpaceSlug,
          preview: noteContent.slice(0, 140),
          body: noteContent,
          isPublished,
          projectId,
          tags,
          time: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        })
      }

      if (!isAutosave) {
        notifications.show({
          title: "Note Saved",
          message: "Research note and paper synthesis saved to library.",
          color: "emerald",
        })
      }
    } catch (err: any) {
      console.warn("Backend save notice:", err?.message)
      setSaveStatus("saved") // Still saved locally
      if (!isAutosave) {
        notifications.show({
          title: "Draft Saved Locally",
          message: "Your notes are saved in your local research workspace.",
          color: "teal",
        })
      }
    }
  }

  // Word and character counts
  const wordCount = noteContent.trim()
    ? noteContent.trim().split(/\s+/).length
    : 0
  const charCount = noteContent.length

  // Quick tag addition
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050a08] text-slate-100 select-none animate-fadeIn">
      {/* Top Navigation & Status Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1c3327] bg-[#09120e] px-4">
        {/* Left Side: Back & Paper info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#162820] hover:text-white transition cursor-pointer"
            title="Return to library"
          >
            <IconArrowLeft className="size-4" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <div className="h-4 w-px bg-[#1c3327]" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="grid size-6 shrink-0 place-items-center rounded bg-rose-500/10 text-rose-400">
              <IconFileText className="size-3.5" />
            </span>
            <span className="truncate text-xs sm:text-sm font-bold text-white max-w-[200px] md:max-w-md">
              {paper.title}
            </span>
            <span className="hidden sm:inline-flex rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              PDF Split Mode
            </span>
          </div>
        </div>

        {/* Center: Zoom controls */}
        <div className="hidden lg:flex items-center rounded-lg border border-[#1c3327] bg-[#111e18] p-0.5 text-xs font-medium text-slate-300">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 15))}
            className="rounded px-2 py-1 hover:bg-[#1c3327] hover:text-white cursor-pointer"
            title="Zoom out"
          >
            <IconMinus className="size-3.5" />
          </button>
          <span className="px-2 py-1 text-[11px] font-semibold text-emerald-400 min-w-[48px] text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(220, z + 15))}
            className="rounded px-2 py-1 hover:bg-[#1c3327] hover:text-white cursor-pointer"
            title="Zoom in"
          >
            <IconPlus className="size-3.5" />
          </button>
          {zoom !== 100 && (
            <button
              type="button"
              onClick={() => setZoom(100)}
              className="border-l border-[#1c3327] px-2 py-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
              title="Reset Zoom"
            >
              <IconRefresh className="size-3" />
            </button>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded bg-[#111e18] border border-[#1c3327]">
            {saveStatus === "saving" ? (
              <span className="text-amber-400 animate-pulse flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Saving...
              </span>
            ) : saveStatus === "unsaved" ? (
              <span className="text-amber-300 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-amber-300" />
                Unsaved
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <IconCheck className="size-3" />
                Saved
              </span>
            )}
          </div>

          {/* Publish Switch */}
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isPublished
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                : "bg-[#111e18] border-[#1c3327] text-slate-400 hover:text-white"
            }`}
            title={
              isPublished
                ? "Published to team (click to make private)"
                : "Private draft (click to publish to team)"
            }
          >
            <IconShare className="size-3.5" />
            <span>{isPublished ? "Team Published" : "Private Draft"}</span>
          </button>

          {/* Save Note Button */}
          <button
            type="button"
            onClick={() => handleSaveNote(false)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <IconDeviceFloppy className="size-4" />
            <span>Save Note</span>
          </button>

          {/* Open in 0x7Note Page */}
          {createdNoteSlugId && onNavigateDocmost && (
            <button
              type="button"
              onClick={() =>
                onNavigateDocmost(`/s/${defaultSpaceSlug}/p/${createdNoteSlugId}`)
              }
              className="hidden lg:flex items-center gap-1.5 rounded-lg border border-[#1c3327] bg-[#111e18] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#1c3327] hover:text-white transition cursor-pointer"
              title="Open full page in 0x7Note"
            >
              <IconExternalLink className="size-3.5" />
              <span>0x7Note</span>
            </button>
          )}

          {/* Download PDF button */}
          {resolvedPdfUrl && (
            <a
              href={resolvedPdfUrl}
              download={paper.title}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-slate-400 hover:bg-[#162820] hover:text-white transition"
              title="Download PDF"
            >
              <IconDownload className="size-4" />
            </a>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#162820] hover:text-white transition cursor-pointer"
            title="Close Split View"
          >
            <IconX className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Split Container */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full overflow-hidden flex flex-row select-text"
      >
        {/* Left Pane: PDF Document Viewer */}
        <div
          style={{ width: `${splitRatio}%` }}
          className="relative h-full overflow-hidden bg-[#020504] flex flex-col border-r border-[#1c3327]"
        >
          {resolvedPdfUrl ? (
            <iframe
              src={resolvedPdfUrl}
              className="h-full w-full bg-white transition-transform duration-100"
              title={paper.title}
              style={
                zoom !== 100
                  ? {
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "top center",
                      width: `${(100 / zoom) * 100}%`,
                      height: `${(100 / zoom) * 100}%`,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <IconFileText className="size-12 text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-white">No PDF Document Linked</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                This research entry was registered with an abstract only or an external web link.
              </p>
              {paper.url && (
                <a
                  href={paper.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white"
                >
                  <IconExternalLink className="size-3.5" />
                  <span>Open External Link</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Draggable Divider Handle */}
        <div
          onPointerDown={handlePointerDown}
          className="relative w-2 shrink-0 bg-[#0e1b14] hover:bg-emerald-500 transition-colors cursor-col-resize flex items-center justify-center group select-none z-10"
          title="Drag to resize split panes"
        >
          <div className="w-0.5 h-8 rounded-full bg-slate-500 group-hover:bg-white" />
        </div>

        {/* Right Pane: Note Taking Workspace */}
        <div
          style={{ width: `${100 - splitRatio}%` }}
          className="h-full flex flex-col bg-[#08100d] overflow-hidden"
        >
          {/* Note Title & Metadata Bar */}
          <div className="p-3 border-b border-[#1c3327] bg-[#0b1612] space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Note Title..."
                className="flex-1 bg-transparent text-sm sm:text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 rounded px-2 py-1 border border-transparent focus:border-emerald-500/50"
              />

              {/* Mode Toggle: Edit / Preview */}
              <div className="flex rounded-lg border border-[#1c3327] bg-[#111e18] p-0.5 text-xs font-medium shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
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

            {/* Tags line */}
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
                placeholder="+ Add tag..."
                className="bg-transparent text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none w-20 px-1 py-0.5"
              />
            </div>
          </div>

          {/* Formatting Toolbar (Only in Edit mode) */}
          {activeTab === "edit" && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#1c3327] bg-[#0c1813] overflow-x-auto text-xs text-slate-300">
              <button
                type="button"
                onClick={() => insertFormatting("**", "**")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white font-bold cursor-pointer"
                title="Bold (Ctrl+B)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("*", "*")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white italic cursor-pointer"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n## ", "\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white font-semibold cursor-pointer"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n### ", "\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white font-semibold cursor-pointer"
                title="Heading 3"
              >
                H3
              </button>
              <div className="h-4 w-px bg-[#1c3327] mx-1" />
              <button
                type="button"
                onClick={() => insertFormatting("\n- ", "\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
                title="Bullet List"
              >
                <IconList className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n1. ", "\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
                title="Numbered List"
              >
                <IconListNumbers className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n> ", "\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
                title="Blockquote"
              >
                <IconQuote className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n> [!NOTE]\n> ", "\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white cursor-pointer"
                title="Note Callout"
              >
                <IconSparkles className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n```\n", "\n```\n")}
                className="p-1 rounded hover:bg-[#162820] hover:text-white font-mono text-[10px] cursor-pointer"
                title="Code block"
              >
                {"</>"}
              </button>
            </div>
          )}

          {/* Editor Body or Preview Body */}
          <div className="flex-1 overflow-y-auto p-4 font-sans text-sm leading-relaxed">
            {activeTab === "edit" ? (
              <textarea
                ref={textareaRef}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Start typing your research synthesis, methodology critique, or experimental notes here..."
                className="w-full h-full min-h-[300px] resize-none bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none font-mono text-xs sm:text-sm leading-6 selection:bg-emerald-500/30"
              />
            ) : (
              <div className="prose prose-invert prose-emerald max-w-none text-slate-200 space-y-4">
                {noteContent.split("\n").map((line, idx) => {
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

          {/* Footer Bar: Metrics & Author Attribution */}
          <footer className="h-9 shrink-0 border-t border-[#1c3327] bg-[#09120e] px-4 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                <strong>{wordCount}</strong> words
              </span>
              <span>·</span>
              <span>
                <strong>{charCount}</strong> chars
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Author:</span>
              <span className="font-semibold text-emerald-400">
                {currentUser.name} ({currentUser.role || "Researcher"})
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
