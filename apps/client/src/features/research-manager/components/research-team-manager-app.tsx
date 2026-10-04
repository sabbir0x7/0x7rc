import {
  type CSSProperties,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import researchLogo from "@/assets/research/0x7-research-logo.png"
import gateBackgroundVideo from "@/assets/research/0x7-gate-background.mp4"
import { useNavigate } from "react-router-dom"
import {
  useResearchNotesQuery,
  useCreatePageMutation,
  useTogglePublishMutation,
  useDeletePageMutation,
  useRemovePageMutation,
  useDeletedPagesQuery,
  useRestorePageMutation,
} from "@/features/page/queries/page-query"
import { useGetSpacesQuery } from "@/features/space/queries/space-query"
import useCurrentUser from "@/features/user/hooks/use-current-user"
import { modals } from "@mantine/modals"
import { Text, useMantineColorScheme, useComputedColorScheme } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconMoon, IconSun, IconSparkles } from "@tabler/icons-react"
import api from "@/lib/api-client"
import { updateUser } from "@/features/user/services/user-service"
import { AccountSettingsModal } from "./account-settings-modal"
import { AiRoadmapChatbox } from "./ai-roadmap-chatbox"
import { RoadmapPhase, BoardTaskItem, PhaseTask } from "../services/gemini-roadmap-service"
import { useSetAtom } from "jotai"
import {
  isSplitViewOpenAtom,
  splitPdfUrlAtom,
  splitPdfNameAtom,
  splitViewModeAtom,
} from "@/features/page/atoms/research-split-atoms"
import "../styles/research-manager.css"
import "../styles/notion-dark.css"

type View = "dashboard" | "progress" | "workspace" | "trash"
type Tab = "notes" | "papers" | "progress" | "roadmap" | "members"

export type Member = {
  id: number | string
  name: string
  email: string
  role: string
  avatar: string
  batch?: string
  section?: string
  studentId?: string
  cgpa?: string | number
  credits?: string | number
  isVerified?: boolean
  bio?: string
  phone?: string
  notes: number
  papers: number
  tasks: number
  share: number
}

type Team = {
  id: string // e.g. "0X7-8F2A" (Team ID)
  name: string
  leaderId: string | number
  leaderName: string
  createdAt: string
}

type Project = {
  id: number
  title: string
  description: string
  created: string
  progress: number
  notes: number
  papers: number
  status: string
  color: string
  deletedAt?: string | null
}

export type AppRoadmapPhase = {
  id: number
  title: string
  description: string
  date: string
  progress: number
  done: boolean
  owner?: Member
  tasks?: PhaseTask[]
}

type Note = {
  id: string | number
  slugId?: string
  spaceSlug?: string
  title: string
  author: Member
  time: string
  tags: string[]
  preview: string
  body: string
  paper?: string
  isPublished?: boolean
  projectId?: string | null
}

type Paper = {
  id: number
  title: string
  authors: string
  source: string
  url: string
  saved?: boolean
  year: number
  added: string
  abstract: string
  pdfDataUrl?: string
  fileSize?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type BoardItem = {
  id: number
  title: string
  body: string
  type: "notice" | "todo"
  author: Member
  created: string
  due?: string
  done: boolean
  tone: "indigo" | "amber" | "emerald" | "rose"
}

type IconName =
  | "home"
  | "folder"
  | "search"
  | "plus"
  | "notes"
  | "paper"
  | "check"
  | "chart"
  | "arrow"
  | "calendar"
  | "users"
  | "more"
  | "menu"
  | "close"
  | "link"
  | "download"
  | "eye"
  | "bold"
  | "italic"
  | "list"
  | "lock"
  | "send"
  | "clock"
  | "spark"
  | "trash"
  | "restore"
  | "copy"
  | "user-minus"

const iconPaths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  folder: (
    <>
      <path d="M3 6.5h7l2 2h9v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 9h18" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4M9 11h6M9 15h6" />
    </>
  ),
  paper: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M14 3v5h5M8 12h8M8 16h8" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12M18 6 6 18" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bold: (
    <>
      <path d="M7 5h6a4 4 0 0 1 0 8H7zM7 13h7a4 4 0 0 1 0 8H7zM7 5v16" />
    </>
  ),
  italic: (
    <>
      <path d="M10 4h8M6 20h8M14 4 10 20" />
    </>
  ),
  list: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4" cy="6" r=".7" fill="currentColor" />
      <circle cx="4" cy="12" r=".7" fill="currentColor" />
      <circle cx="4" cy="18" r=".7" fill="currentColor" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4zM22 2 11 13" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  restore: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  copy: (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  "user-minus": (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="22" x2="16" y1="11" y2="11" />
    </>
  ),
}

function Icon({
  name,
  className = "size-5",
}: {
  name: IconName
  className?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  )
}

const defaultInitialLeader: Member = {
  id: 1,
  name: "Md Sabbir Ahmed",
  email: "ss@gmail.com",
  role: "Team Leader",
  avatar: "",
  batch: "63rd Batch",
  section: "Section C",
  studentId: "0272320005101220",
  cgpa: 3.39,
  credits: 119.5,
  isVerified: true,
  bio: "Lead researcher exploring distributed workspace architectures and neural knowledge retrieval.",
  notes: 0,
  papers: 0,
  tasks: 0,
  share: 100,
}

const defaultInitialTeam: Team = {
  id: "0X7-8F2A",
  name: "0x7 Research Unit",
  leaderId: 1,
  leaderName: "ss",
  createdAt: "Oct 2, 2026",
}

const members: Member[] = [defaultInitialLeader]

const initialProjects: Project[] = []
const initialNotes: Note[] = []
const initialNotesByProject: Record<number, Note[]> = {}
const initialPapers: Paper[] = []
const initialPapersByProject: Record<number, Paper[]> = {}

const initialPhases: AppRoadmapPhase[] = [
  {
    id: 1,
    title: "Research framing",
    description: "Define questions, scope, and success criteria.",
    date: "Jan 12 – Jan 24",
    progress: 100,
    done: true,
    owner: members[0],
  },
  {
    id: 2,
    title: "Literature review",
    description: "Collect, classify, and synthesize foundational work.",
    date: "Jan 25 – Feb 28",
    progress: 100,
    done: true,
    owner: members[0],
  },
  {
    id: 3,
    title: "Experiment design",
    description: "Lock models, benchmarks, and evaluation protocols.",
    date: "Mar 01 – Apr 12",
    progress: 72,
    done: false,
    owner: members[0],
  },
  {
    id: 4,
    title: "Evaluation & analysis",
    description: "Run experiments and interpret comparative results.",
    date: "Apr 13 – May 24",
    progress: 34,
    done: false,
    owner: members[0],
  },
  {
    id: 5,
    title: "Writing & review",
    description: "Draft findings, peer review, and final publication.",
    date: "May 25 – Jun 30",
    progress: 0,
    done: false,
    owner: members[0],
  },
]

const initialBoardItems: BoardItem[] = [
  {
    id: 1,
    title: "Weekly research sync",
    body: "Bring one key finding and one open question from your current reading.",
    type: "notice",
    author: defaultInitialLeader,
    created: "Today",
    due: "Thu, 10:00 AM",
    done: false,
    tone: "indigo",
  },
  {
    id: 2,
    title: "Finalize benchmark shortlist",
    body: "Review notes and leave comments before the evaluation meeting.",
    type: "todo",
    author: defaultInitialLeader,
    created: "2h ago",
    due: "Due Apr 26",
    done: false,
    tone: "amber",
  },
  {
    id: 3,
    title: "Upload annotated papers",
    body: "Add the three long-context papers discussed in Monday's session.",
    type: "todo",
    author: defaultInitialLeader,
    created: "Yesterday",
    done: true,
    tone: "emerald",
  },
]

function Avatar({
  member,
  size = "md",
}: {
  member?: Member | null
  size?: "sm" | "md" | "lg"
}) {
  const sizes = { sm: "size-7", md: "size-9", lg: "size-12" }
  const textSizes = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" }
  const safeMember = member || defaultInitialLeader
  if (!safeMember.avatar) {
    const initials = (safeMember.name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
    return (
      <span
        title={safeMember.name}
        className={`${sizes[size]} shrink-0 inline-grid place-items-center rounded-full border-2 border-white bg-indigo-600 text-white font-bold ${textSizes[size]} shadow-2xs`}
      >
        {initials}
      </span>
    )
  }
  return (
    <img
      src={safeMember.avatar}
      alt={safeMember.name}
      title={safeMember.name}
      className={`${sizes[size]} shrink-0 rounded-full border-2 border-white object-cover bg-slate-100`}
    />
  )
}

function AvatarStack({ people = members }: { people?: Member[] }) {
  return (
    <div className="flex -space-x-2.5">
      {people.filter(Boolean).map((member) => (
        <Avatar key={member.id} member={member} />
      ))}
    </div>
  )
}

function ProgressBar({
  value,
  color = "bg-indigo-600",
}: {
  value: number
  color?: string
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled,
  title,
}: {
  children: ReactNode
  variant?: "primary" | "secondary" | "ghost"
  className?: string
  type?: "button" | "submit"
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  const styles = {
    primary:
      "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md",
    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  }
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
      {children}
    </span>
  )
}

function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white dark:bg-[#111f18] text-slate-900 dark:text-[#f0fdf4] border border-transparent dark:border-[#1c3327] shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 dark:border-[#1c3327] bg-white/95 dark:bg-[#111f18]/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-950 dark:text-[#f0fdf4]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-[#162820] hover:text-slate-700 dark:hover:text-white"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function InAppPdfReaderModal({
  paper,
  onClose,
  onSplitView,
}: {
  paper: Paper
  onClose: () => void
  onSplitView: (paper: Paper) => void
}) {
  const [zoom, setZoom] = useState(100)
  const pdfUrl = paper.pdfDataUrl || paper.url

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050a08] text-slate-100">
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#1c3327] bg-[#0d1713] px-4 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#162820] hover:text-white transition cursor-pointer"
          >
            <Icon name="arrow" className="size-3.5 rotate-180" />
            <span>Library</span>
          </button>
          <div className="h-4 w-px bg-[#1c3327]" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="grid size-6 shrink-0 place-items-center rounded bg-rose-500/10 text-rose-400">
              <Icon name="paper" className="size-3.5" />
            </span>
            <span className="truncate text-sm font-bold text-white max-w-xs sm:max-w-md md:max-w-lg">
              {paper.title}
            </span>
            <span className="hidden sm:inline-flex rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              PDF
            </span>
            {paper.fileSize && (
              <span className="hidden md:inline-flex rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {paper.fileSize}
              </span>
            )}
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-[#1c3327] bg-[#162820] p-0.5 text-xs font-medium text-slate-300">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 20))}
              className="rounded px-2 py-1 hover:bg-[#1f372c] hover:text-white cursor-pointer"
              title="Zoom out"
            >
              -
            </button>
            <span className="px-2 py-1 text-[11px] font-semibold text-emerald-400 min-w-[44px] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(250, z + 20))}
              className="rounded px-2 py-1 hover:bg-[#1f372c] hover:text-white cursor-pointer"
              title="Zoom in"
            >
              +
            </button>
            {zoom !== 100 && (
              <button
                onClick={() => setZoom(100)}
                className="border-l border-[#1c3327] px-2 py-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Split View with Notes CTA Button */}
          <button
            onClick={() => onSplitView(paper)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            title="Open Note Taking editor side-by-side with this PDF"
          >
            <Icon name="notes" className="size-4" />
            <span className="hidden sm:inline">Split View Notes</span>
            <span className="sm:hidden">Split</span>
          </button>

          {/* Download button */}
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={paper.title}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg p-2 text-slate-400 hover:bg-[#162820] hover:text-white transition"
              title="Download PDF"
            >
              <Icon name="download" className="size-4" />
            </a>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-[#162820] hover:text-white transition cursor-pointer"
            title="Close PDF Reader"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      </header>

      {/* Viewer Body */}
      <div className="relative flex-1 w-full overflow-hidden bg-[#050a08] flex items-center justify-center p-2">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="h-full w-full rounded-xl border border-[#1c3327] bg-white shadow-2xl"
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
          <div className="text-center p-8">
            <p className="text-sm text-slate-400">PDF source is unavailable or not loaded.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectActionMenu({
  project,
  onMoveToTrash,
  align = "right",
}: {
  project: Project
  onMoveToTrash: (project: Project) => void
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div
      className="relative inline-block"
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Project options"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <Icon name="more" className="size-4" />
      </button>

      {open && (
        <div
          style={{ width: "165px" }}
          className={`absolute ${
            align === "left" ? "left-0" : "right-0"
          } top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onMoveToTrash(project)
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold whitespace-nowrap text-rose-600 transition hover:bg-rose-50"
          >
            <Icon name="trash" className="size-4 shrink-0 text-rose-600" />
            Move to Trash
          </button>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  view,
  projects,
  selectedProjectId,
  onNew,
  onDashboard,
  onTrash,
  trashCount = 0,
  onProject,
  mobileOpen,
  setMobileOpen,
  currentUser,
  team,
  members = [],
  onCopyTeamId,
  colorScheme = "light",
  onToggleTheme,
  onOpenAccountSettings,
  onSignOut,
}: {
  view: View
  projects: Project[]
  selectedProjectId?: number
  onNew: () => void
  onDashboard: () => void
  onTrash: () => void
  trashCount?: number
  onProject: (project: Project) => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  currentUser?: Member
  team?: Team
  members?: Member[]
  onCopyTeamId?: () => void
  colorScheme?: string
  onToggleTheme?: () => void
  onOpenAccountSettings?: () => void
  onSignOut?: () => void
}) {
  const activeUser = currentUser || members[0] || defaultInitialLeader
  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        style={{
          backgroundColor: colorScheme === "dark" ? "#0d1713" : undefined,
          borderColor: colorScheme === "dark" ? "#1c3327" : undefined,
        }}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <button onClick={onDashboard} className="flex items-center gap-2">
            <img
              src={researchLogo}
              alt="0x7 Research logo"
              className="size-9 shrink-0 rounded-xl object-cover shadow-md"
            />
            <span className="brand-wordmark bg-gradient-to-r from-slate-950 via-indigo-700 to-teal-500 bg-clip-text text-[19px] font-bold whitespace-nowrap text-transparent">
              <span className="brand-code">0x7</span> Research Center
            </span>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <Icon name="close" />
          </button>
        </div>
        <nav className="space-y-1">
          <button
            onClick={onDashboard}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              view === "dashboard"
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <Icon name="home" />
            Dashboard
          </button>
          <button
            onClick={onTrash}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              view === "trash"
                ? "bg-rose-50 text-rose-700 font-bold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon
                name="trash"
                className={view === "trash" ? "text-rose-600" : "text-slate-400"}
              />
              Trash
            </div>
            {trashCount > 0 && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                {trashCount}
              </span>
            )}
          </button>
        </nav>

        {/* Team ID Card */}
        <div className="mt-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 p-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              Team ID
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
              {members.length}/6 members
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-1">
            <code className="font-mono text-xs font-extrabold tracking-wider text-slate-900">
              {team?.id || "0X7-8F2A"}
            </code>
            <button
              type="button"
              onClick={onCopyTeamId}
              title="Copy Team ID"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-indigo-600 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Icon name="copy" className="size-3" />
              Copy
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between px-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Projects
          </p>
          <button
            onClick={onNew}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Create project"
          >
            <Icon name="plus" className="size-4" />
          </button>
        </div>
        <div className="mt-2 space-y-1">
          {projects.slice(0, 4).map((project) => (
            <button
              key={project.id}
              onClick={() => onProject(project)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                view === "workspace" && project.id === selectedProjectId
                  ? "bg-slate-100 font-semibold text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <span className={`size-2 rounded-full ${project.color}`} />
              <span className="min-w-0 flex-1 truncate">{project.title}</span>
              <span className="text-xs text-slate-400 opacity-0 transition group-hover:opacity-100">
                {project.progress}%
              </span>
            </button>
          ))}
        </div>
        <div className="mt-auto border-t border-slate-100 pt-3">
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="sidebar-theme-toggle mb-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              title="Toggle Light / Dark mode"
            >
              <div className="flex items-center gap-2.5">
                {colorScheme === "dark" ? (
                  <IconSun size={15} className="text-amber-400 shrink-0" />
                ) : (
                  <IconMoon size={15} className="text-indigo-600 shrink-0" />
                )}
                <span>{colorScheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </div>
              <span className="badge-theme rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {colorScheme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="group flex flex-1 items-center gap-2.5 rounded-xl p-2 text-left transition hover:bg-slate-100 dark:hover:bg-[#16291e] cursor-pointer min-w-0"
              title="Edit Account & Profile"
            >
              <div className="relative shrink-0">
                <Avatar member={activeUser} />
                <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-emerald-600 text-[9px] text-white opacity-0 group-hover:opacity-100 transition shadow">
                  ✎
                </span>
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-xs font-semibold text-slate-800 dark:text-[#f0fdf4]">
                  <span className="truncate">{activeUser.name}</span>
                  {activeUser.isVerified && (
                    <span className="inline-flex items-center text-emerald-500 font-bold text-xs" title="Verified Student">
                      ✓
                    </span>
                  )}
                </span>
                <span className="block truncate text-[11px] font-semibold text-indigo-600 dark:text-emerald-400">
                  {activeUser.studentId ? `ID: ${activeUser.studentId}` : activeUser.batch ? `${activeUser.batch} · ${activeUser.section || activeUser.role}` : activeUser.role}
                </span>
              </span>
            </button>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition"
                title="Log out"
              >
                <Icon name="arrow" className="size-4 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function Topbar({
  onMenu,
  currentUser,
  team,
  membersCount = 1,
  onCopyTeamId,
  colorScheme = "light",
  onToggleTheme,
  onOpenAccountSettings,
}: {
  onMenu: () => void
  currentUser?: Member
  team?: Team
  membersCount?: number
  onCopyTeamId?: () => void
  colorScheme?: string
  onToggleTheme?: () => void
  onOpenAccountSettings?: () => void
}) {
  const activeUser = currentUser || defaultInitialLeader
  return (
    <div
      style={{
        backgroundColor: colorScheme === "dark" ? "rgba(13, 23, 19, 0.95)" : undefined,
        borderColor: colorScheme === "dark" ? "#1c3327" : undefined,
      }}
      className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden"
    >
      <button
        onClick={onMenu}
        className="rounded-xl border border-slate-200 p-2 text-slate-600"
      >
        <Icon name="menu" />
      </button>
      <div className="flex items-center gap-2 whitespace-nowrap text-base font-extrabold tracking-tight">
        <img
          src={researchLogo}
          alt="0x7 Research logo"
          className="size-9 shrink-0 rounded-lg object-cover shadow-sm"
        />
        <span className="brand-wordmark bg-gradient-to-r from-slate-950 via-indigo-700 to-teal-500 bg-clip-text text-transparent">
          <span className="brand-code">0x7</span> Research Center
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            title="Toggle Light / Dark mode"
          >
            {colorScheme === "dark" ? (
              <IconSun size={15} className="text-amber-400" />
            ) : (
              <IconMoon size={15} className="text-indigo-600" />
            )}
          </button>
        )}
        {team && (
          <button
            type="button"
            onClick={onCopyTeamId}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-bold text-indigo-700"
            title="Copy Team ID"
          >
            <Icon name="copy" className="size-3" />
            {team.id}
          </button>
        )}
        <button
          type="button"
          onClick={onOpenAccountSettings}
          className="rounded-full transition hover:ring-2 hover:ring-emerald-500/50 cursor-pointer"
          title="Account & Profile Settings"
        >
          <Avatar member={activeUser} size="sm" />
        </button>
      </div>
    </div>
  )
}

function NoticeBoard({
  items = initialBoardItems,
  setItems = () => undefined,
  currentUser,
  membersCount = 1,
}: {
  items?: BoardItem[]
  setItems?: (items: BoardItem[]) => void
  currentUser?: Member
  membersCount?: number
}) {
  const [composing, setComposing] = useState(false)
  const [type, setType] = useState<"notice" | "todo">("notice")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [due, setDue] = useState("")
  const tones = {
    indigo: {
      card: "border-indigo-100 bg-indigo-50/70",
      icon: "bg-indigo-600 text-white",
      accent: "bg-indigo-400",
    },
    amber: {
      card: "border-amber-100 bg-amber-50/80",
      icon: "bg-amber-400 text-amber-950",
      accent: "bg-amber-400",
    },
    emerald: {
      card: "border-emerald-100 bg-emerald-50/70",
      icon: "bg-emerald-500 text-white",
      accent: "bg-emerald-400",
    },
    rose: {
      card: "border-rose-100 bg-rose-50/70",
      icon: "bg-rose-500 text-white",
      accent: "bg-rose-400",
    },
  }
  const saveItem = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) return
    setItems([
      {
        id: Date.now(),
        title,
        body,
        type,
        author: currentUser || members[0] || defaultInitialLeader,
        created: "Just now",
        due: due || undefined,
        done: false,
        tone: type === "todo" ? "amber" : "indigo",
      },
      ...items,
    ])
    setTitle("")
    setBody("")
    setDue("")
    setComposing(false)
  }
  const toggleItem = (id: number) =>
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    )

  const deleteItem = (id: number, itemTitle: string) => {
    modals.openConfirmModal({
      title: "Delete notice or task?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete &ldquo;{itemTitle}&rdquo;? This will remove it from the team notice board.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        setItems(items.filter((item) => item.id !== id))
      },
    })
  }

  return (
    <aside className="xl:sticky xl:top-8 xl:self-start">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white">
          <div className="absolute -top-8 -right-8 size-28 rounded-full bg-indigo-500/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-indigo-500">
                  <Icon name="notes" className="size-4" />
                </span>
                <h2 className="font-bold">Team notice board</h2>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <Icon name="users" className="size-3.5" />
                Visible to all {membersCount} team member{membersCount === 1 ? "" : "s"}
              </p>
            </div>
            <button
              onClick={() => setComposing(!composing)}
              className="grid size-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Create a notice or task"
            >
              <Icon name={composing ? "close" : "plus"} className="size-4" />
            </button>
          </div>
        </div>

        {composing && (
          <form
            onSubmit={saveItem}
            className="border-b border-slate-100 bg-slate-50 p-4"
          >
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1">
              {(["notice", "todo"] as const).map((itemType) => (
                <button
                  key={itemType}
                  type="button"
                  onClick={() => setType(itemType)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                    type === itemType
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {itemType === "todo" ? "To-do" : "Notice"}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                type === "todo" ? "What needs to be done?" : "Notice title"
              }
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
            />
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Add details for the team..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-5 text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
            />
            <label className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-400">
              <Icon name="calendar" className="size-4" />
              <input
                value={due}
                onChange={(event) => setDue(event.target.value)}
                placeholder="Due date or meeting time (optional)"
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none"
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                className="px-3 py-2"
                onClick={() => setComposing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-3 py-2"
                disabled={!title.trim() || !body.trim()}
              >
                <Icon name="send" className="size-3.5" />
                Share with team
              </Button>
            </div>
          </form>
        )}

        <div className="max-h-[620px] space-y-3 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No notices or to-dos yet. Click below to add one.
            </div>
          ) : (
            items.map((item) => {
              const tone = tones[item.tone]
              return (
                <article
                  key={item.id}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${tone.card} ${
                    item.done ? "opacity-65" : ""
                  }`}
                >
                  <span
                    className={`absolute top-0 left-6 h-1 w-12 rounded-b-full ${tone.accent}`}
                  />
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => item.type === "todo" && toggleItem(item.id)}
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl shadow-sm transition ${
                        item.type === "notice" ? "bg-slate-950" : tone.icon
                      } ${
                        item.type === "todo" ? "hover:scale-105" : ""
                      }`}
                      aria-label={
                        item.type === "todo"
                          ? `${item.done ? "Reopen" : "Complete"} ${item.title}`
                          : "Team notice"
                      }
                    >
                      {item.type === "notice" ? (
                        <img
                          src={researchLogo}
                          alt="0x7 Research"
                          className="size-8 rounded-xl object-cover"
                        />
                      ) : (
                        <Icon
                          name={item.done ? "check" : "list"}
                          className="size-4"
                        />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm font-bold leading-5 text-slate-900 ${
                            item.done ? "line-through" : ""
                          }`}
                        >
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                            {item.type === "todo" ? "To-do" : "Notice"}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteItem(item.id, item.title)
                            }}
                            className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="Delete"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Icon name="trash" className="size-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {item.body}
                      </p>
                    {item.due && (
                      <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <Icon name="clock" className="size-3" />
                        {item.due}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
                  <div className="flex items-center gap-2">
                    <Avatar member={item.author || defaultInitialLeader} size="sm" />
                    <span className="text-[10px] font-semibold text-slate-600">
                      {item.author?.name || defaultInitialLeader.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {item.created}
                  </span>
                </div>
              </article>
            )
          }))}
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button
            onClick={() => setComposing(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-bold text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Icon name="plus" className="size-4" />
            Add notice or to-do
          </button>
        </div>
      </div>
    </aside>
  )
}

function Dashboard({
  projects,
  boardItems,
  setBoardItems,
  onNew,
  onOpen,
  onMoveToTrash,
  totalNotesCount = 0,
  yourNotesCount = 0,
  publishedNotesCount = 0,
  currentUser,
  team,
  members = [],
  onCopyTeamId,
  colorScheme = "light",
  onToggleTheme,
  onOpenAccountSettings,
}: {
  projects: Project[]
  boardItems: BoardItem[]
  setBoardItems: (items: BoardItem[]) => void
  onNew: () => void
  onOpen: (project: Project) => void
  onMoveToTrash: (project: Project) => void
  totalNotesCount?: number
  yourNotesCount?: number
  publishedNotesCount?: number
  currentUser?: Member
  team?: Team
  members?: Member[]
  onCopyTeamId?: () => void
  colorScheme?: string
  onToggleTheme?: () => void
  onOpenAccountSettings?: () => void
}) {
  const [search, setSearch] = useState("")
  const [boardWidth, setBoardWidth] = useState(50)
  const [resizing, setResizing] = useState(false)
  const splitRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef(false)
  const resizeBoard = (clientX: number) => {
    const bounds = splitRef.current?.getBoundingClientRect()
    if (!bounds) return
    const nextWidth = ((clientX - bounds.left) / bounds.width) * 100
    const maxBoardWidth = Math.min(65, 100 - (430 / bounds.width) * 100)
    setBoardWidth(Math.min(maxBoardWidth, Math.max(32, nextWidth)))
  }
  const visible = projects.filter((project) =>
    `${project.title} ${project.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const stats = [
    {
      label: "Active projects",
      value: projects.length,
      detail: projects.length > 0 ? `${projects.length} active topics` : "No projects yet",
      icon: "folder" as IconName,
      tint: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Total notes",
      value: totalNotesCount,
      detail: totalNotesCount > 0 ? `${totalNotesCount} in database` : "No notes yet",
      icon: "notes" as IconName,
      tint: "bg-violet-50 text-violet-600",
    },
    {
      label: "Personal drafts",
      value: yourNotesCount,
      detail: yourNotesCount > 0 ? `${yourNotesCount} private drafts` : "No drafts yet",
      icon: "lock" as IconName,
      tint: "bg-amber-50 text-amber-600",
    },
    {
      label: "Published notes",
      value: publishedNotesCount,
      detail: publishedNotesCount > 0 ? `${publishedNotesCount} shared with team` : "No published notes",
      icon: "check" as IconName,
      tint: "bg-emerald-50 text-emerald-600",
    },
  ]
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold text-indigo-600">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Good morning, {currentUser?.name || "Researcher"}
            </h1>
            {currentUser?.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-400" title="Verified Student">
                ✓ {currentUser.batch || "Verified"}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Here’s what’s happening across your research projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onOpenAccountSettings && (
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#f0fdf4] shadow-2xs transition hover:border-slate-300 dark:hover:bg-[#16291e] cursor-pointer"
              title="Edit Profile & Academic Credentials"
            >
              <span>✎ Edit Profile</span>
            </button>
          )}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-slate-300"
              title="Toggle Light / Dark mode"
            >
              {colorScheme === "dark" ? (
                <IconSun size={15} className="text-amber-400" />
              ) : (
                <IconMoon size={15} className="text-indigo-600" />
              )}
              <span className="hidden sm:inline">
                {colorScheme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </button>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 px-3.5 py-2 shadow-2xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Team ID
              </span>
              <span className="font-mono text-sm font-bold text-indigo-700">
                {team?.id || "0X7-8F2A"}
              </span>
            </div>
            <button
              type="button"
              onClick={onCopyTeamId}
              title="Copy Team ID"
              className="ml-1 inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-600 shadow-2xs border border-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Icon name="copy" className="size-3.5" />
              Copy
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs">
            <span className="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icon name="users" className="size-4" />
            </span>
            <span className="text-xs font-bold text-slate-700">
              {members.length} / 6 <span className="font-normal text-slate-500">Members</span>
            </span>
          </div>
        </div>
      </header>
      <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div
                className={`grid size-10 place-items-center rounded-xl ${stat.tint}`}
              >
                <Icon name={stat.icon} className="size-5" />
              </div>
              <span className="hidden rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 sm:block">
                {stat.detail}
              </span>
            </div>
            <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">
              {stat.label}
            </p>
          </div>
        ))}
      </section>
      <div
        ref={splitRef}
        className={`dashboard-split mt-8 ${resizing ? "is-resizing" : ""}`}
        style={{ "--board-width": `${boardWidth}%` } as CSSProperties}
      >
        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="shrink-0">
              <h2 className="whitespace-nowrap text-lg font-bold text-slate-900">
                Your projects
              </h2>
              <p className="whitespace-nowrap text-sm text-slate-500">
                {projects.length} active research workspaces
              </p>
            </div>
            <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-400 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 sm:w-72">
              <Icon name="search" className="size-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="Search projects..."
              />
            </label>
          </div>
          <div className="space-y-4">
            {visible.map((project) => (
              <div
                key={project.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(project)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onOpen(project)
                  }
                }}
                className="group w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`mt-1 block h-12 w-1.5 shrink-0 rounded-full ${project.color}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                            {project.title}
                          </h3>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                            {project.status}
                          </span>
                        </div>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                          {project.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <ProjectActionMenu
                          project={project}
                          onMoveToTrash={onMoveToTrash}
                        />
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400 transition group-hover:bg-indigo-600 group-hover:text-white">
                          <Icon name="arrow" className="size-4" />
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-end gap-5">
                      <div className="min-w-32 flex-1">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Research team
                        </p>
                        <AvatarStack />
                      </div>
                      <div className="min-w-40 flex-[2]">
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-600">
                            Project progress
                          </span>
                          <span className="font-bold text-slate-900">
                            {project.progress}%
                          </span>
                        </div>
                        <ProgressBar
                          value={project.progress}
                          color={project.color}
                        />
                      </div>
                      <div className="flex min-w-[190px] flex-1 flex-nowrap justify-end gap-4 text-xs font-semibold text-slate-500">
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <Icon
                            name="notes"
                            className="size-4 text-slate-400"
                          />
                          {project.notes} notes
                        </span>
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <Icon
                            name="paper"
                            className="size-4 text-slate-400"
                          />
                          {project.papers} papers
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400">
                      <Icon name="calendar" className="size-4" />
                      Created {project.created}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {visible.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Icon name={projects.length === 0 ? "folder" : "search"} />
                </span>
                <h3 className="mt-4 font-bold text-slate-800">
                  {projects.length === 0
                    ? "Create your first project"
                    : "No projects found"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {projects.length === 0
                    ? "Start with an empty research workspace."
                    : "Try a different project name or keyword."}
                </p>
                {projects.length === 0 && (
                  <Button className="mt-5" onClick={onNew}>
                    <Icon name="plus" className="size-4" />
                    Create Project
                  </Button>
                )}
              </div>
            )}
          </div>
        </section>
        <div
          role="separator"
          aria-label="Resize notice board"
          aria-orientation="vertical"
          aria-valuemin={32}
          aria-valuemax={65}
          aria-valuenow={Math.round(boardWidth)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            resizingRef.current = true
            setResizing(true)
            resizeBoard(event.clientX)
          }}
          onPointerMove={(event) => {
            if (resizingRef.current) resizeBoard(event.clientX)
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId)
            resizingRef.current = false
            setResizing(false)
          }}
          onPointerCancel={() => {
            resizingRef.current = false
            setResizing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              setBoardWidth((width) => Math.max(32, width - 2))
            }
            if (event.key === "ArrowRight") {
              event.preventDefault()
              const bounds = splitRef.current?.getBoundingClientRect()
              const maxWidth = bounds
                ? Math.min(65, 100 - (430 / bounds.width) * 100)
                : 65
              setBoardWidth((width) => Math.min(maxWidth, width + 2))
            }
          }}
          className="split-handle group hidden cursor-col-resize touch-none items-center justify-center xl:flex"
        >
          <span className="flex h-16 w-2 flex-col items-center justify-center gap-1 rounded-full border border-slate-200 bg-white shadow-sm transition group-hover:border-indigo-300 group-hover:bg-indigo-50 group-focus:border-indigo-400 group-focus:outline-none">
            <span className="size-1 rounded-full bg-slate-400 group-hover:bg-indigo-500" />
            <span className="size-1 rounded-full bg-slate-400 group-hover:bg-indigo-500" />
            <span className="size-1 rounded-full bg-slate-400 group-hover:bg-indigo-500" />
          </span>
        </div>
        <NoticeBoard
          items={boardItems}
          setItems={setBoardItems}
          currentUser={currentUser}
          membersCount={members.length}
        />
      </div>
    </main>
  )
}

function CreateProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (project: Project) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Member[]>([members[0]])
  const [memberQuery, setMemberQuery] = useState("")
  const candidates = members.filter(
    (member) =>
      !selected.some((item) => item.id === member.id) &&
      `${member.name} ${member.email}`
        .toLowerCase()
        .includes(memberQuery.toLowerCase()),
  )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    onCreate({
      id: Date.now(),
      title,
      description: description || "A new collaborative research project.",
      created: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      progress: 0,
      notes: 0,
      papers: 0,
      status: "New",
      color: "bg-indigo-600",
    })
  }
  return (
    <Modal
      title="Create a new project"
      description="Set up a focused workspace for your research team."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="space-y-6 p-6">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">
            Research topic name
          </span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Efficient language model alignment"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
          />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm font-semibold text-slate-700">
            Short description{" "}
            <span className="font-normal text-slate-400">
              {description.length}/180
            </span>
          </span>
          <textarea
            value={description}
            onChange={(event) =>
              setDescription(event.target.value.slice(0, 180))
            }
            rows={3}
            placeholder="What will your team investigate?"
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100"
          />
        </label>
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Team members
            </span>
            <span className="text-xs font-medium text-slate-400">
              {selected.length}/4 members
            </span>
          </div>
          <div className="mt-2 rounded-xl border border-slate-200 p-2">
            <label className="flex items-center gap-2 px-2 py-1.5 text-slate-400">
              <Icon name="search" className="size-4" />
              <input
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                disabled={selected.length === 4}
                placeholder={
                  selected.length === 4
                    ? "Team is full"
                    : "Search by name or email..."
                }
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none disabled:cursor-not-allowed"
              />
            </label>
            {memberQuery && candidates.length > 0 && selected.length < 4 && (
              <div className="mt-1 border-t border-slate-100 pt-1">
                {candidates.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelected([...selected, member])
                      setMemberQuery("")
                    }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                  >
                    <Avatar member={member} size="sm" />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        {member.name}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {member.email}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {selected.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <Avatar member={member} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {member.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {member.id === 1 ? "Owner" : member.role}
                  </span>
                </span>
                {member.id !== 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        selected.filter((item) => item.id !== member.id),
                      )
                    }
                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                  >
                    <Icon name="close" className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()}>
            <Icon name="plus" className="size-4" />
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function ModernRoadmapChart({
  project,
  totalNotes = 0,
  publishedNotes = 0,
}: {
  project: Project
  totalNotes?: number
  publishedNotes?: number
}) {
  const [activePoint, setActivePoint] = useState(6)
  const [range, setRange] = useState("12 weeks")

  // Real database-driven progress:
  // Base progress from personal notes (drafts) + published notes
  const progress = totalNotes > 0
    ? Math.min(100, Math.round(((publishedNotes * 2 + (totalNotes - publishedNotes)) / Math.max(1, totalNotes * 2)) * 100))
    : project.progress || 0

  const labels = ["W-6", "W-5", "W-4", "W-3", "W-2", "W-1", "Current"]
  const points = labels.map((label, index) => {
    const factor = totalNotes === 0 && progress === 0
      ? 0
      : Math.round(((index + 1) / labels.length) * progress)
    return {
      x: 48 + index * 92,
      y: 205 - factor * 1.55,
      value: factor,
      label,
    }
  })
  const linePath = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`
    const previous = points[index - 1]
    const middle = (previous.x + point.x) / 2
    return `${path} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`
  }, "")
  const selected = points[activePoint] || points[points.length - 1]
  const tooltipX = Math.min(570, Math.max(42, selected.x - 38))

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon name="chart" className="size-4" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Roadmap velocity</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {project.title} · cumulative completion
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          {["4 weeks", "12 weeks", "All"].map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition ${
                range === item
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative grid size-24 shrink-0 place-items-center">
              <svg
                viewBox="0 0 96 96"
                className="absolute inset-0 size-full -rotate-90 drop-shadow-sm"
                role="img"
                aria-label={`${progress}% complete`}
              >
                <defs>
                  <linearGradient
                    id={`progress-ring-${project.id}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="55%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  fill="none"
                  stroke="#eef2ff"
                  strokeWidth="9"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  fill="none"
                  stroke={`url(#progress-ring-${project.id})`}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 2.388} 238.8`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="relative text-center">
                <strong className="block text-xl font-extrabold tracking-tight text-slate-950">
                  {progress}%
                </strong>
                <span className="block text-[8px] font-bold tracking-wide text-slate-400">
                  COMPLETE
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Overall progress
              </p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                Project is moving forward
              </p>
              <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                +18% this month
              </span>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-semibold text-slate-400">
              SELECTED POINT
            </p>
            <p className="mt-1 text-xs font-bold text-slate-700">
              {selected.label} · {selected.value}%
            </p>
          </div>
        </div>

        <div className="mt-2 overflow-x-auto">
          <svg
            viewBox="0 0 640 250"
            className="h-64 min-w-[560px] w-full"
            role="img"
            aria-label={`Project completion grew to ${progress} percent`}
          >
            <defs>
              <linearGradient id="modern-roadmap-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity=".3" />
                <stop offset="72%" stopColor="#8b5cf6" stopOpacity=".07" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="modern-roadmap-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="point-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {[50, 100, 150, 200].map((y, index) => (
              <g key={y}>
                <line
                  x1="45"
                  y1={y}
                  x2="612"
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 7"
                />
                <text x="8" y={y + 4} fill="#94a3b8" fontSize="9">
                  {100 - index * 25}%
                </text>
              </g>
            ))}

            <rect
              x={selected.x - 25}
              y="24"
              width="50"
              height="182"
              rx="14"
              fill="#6366f1"
              opacity=".045"
            />
            <line
              x1={selected.x}
              y1="30"
              x2={selected.x}
              y2="205"
              stroke="#818cf8"
              strokeDasharray="4 5"
              opacity=".6"
            />
            <path
              d={`${linePath} L ${points[points.length - 1].x} 208 L ${points[0].x} 208 Z`}
              fill="url(#modern-roadmap-area)"
            />
            <path
              d={linePath}
              fill="none"
              stroke="url(#modern-roadmap-line)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {points.map((point, index) => (
              <g
                key={point.label}
                onMouseEnter={() => setActivePoint(index)}
                onClick={() => setActivePoint(index)}
                className="cursor-pointer"
              >
                <circle cx={point.x} cy={point.y} r="14" fill="transparent" />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={activePoint === index ? 6 : 4}
                  fill={activePoint === index ? "#6366f1" : "white"}
                  stroke={activePoint === index ? "white" : "#6366f1"}
                  strokeWidth="3"
                  filter={activePoint === index ? "url(#point-glow)" : undefined}
                  className="transition-all"
                />
                <text
                  x={point.x}
                  y="231"
                  textAnchor="middle"
                  fill={activePoint === index ? "#334155" : "#94a3b8"}
                  fontSize="9"
                  fontWeight={activePoint === index ? "700" : "500"}
                >
                  {point.label}
                </text>
              </g>
            ))}

            <g transform={`translate(${tooltipX}, ${Math.max(14, selected.y - 46)})`}>
              <rect width="76" height="32" rx="10" fill="#0f172a" />
              <text
                x="38"
                y="20"
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="700"
              >
                {selected.value}% complete
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
        {[
          ["Research framing", "Complete", "text-emerald-600"],
          ["Experiment design", "72%", "text-indigo-600"],
          ["Evaluation", "In progress", "text-amber-600"],
        ].map(([label, value, color]) => (
          <div key={label} className="px-3 py-3.5 text-center">
            <p className="truncate text-[10px] font-semibold text-slate-400">
              {label}
            </p>
            <p className={`mt-1 text-xs font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProgressView({
  project,
  totalNotes = 0,
  publishedNotes = 0,
  onBack,
  onWorkspace,
}: {
  project: Project
  totalNotes?: number
  publishedNotes?: number
  onBack: () => void
  onWorkspace: () => void
}) {
  const progressPercent = totalNotes > 0
    ? Math.min(100, Math.round(((publishedNotes * 2 + (totalNotes - publishedNotes)) / Math.max(1, totalNotes * 2)) * 100))
    : project.progress || 0
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600"
      >
        <Icon name="arrow" className="size-4 rotate-180" />
        Back to dashboard
      </button>
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              {project.title}
            </h1>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {project.status}
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {project.description}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <AvatarStack />
            <span className="text-xs font-medium text-slate-500">
              4 collaborators
            </span>
          </div>
        </div>
        <Button onClick={onWorkspace}>
          Open workspace
          <Icon name="arrow" className="size-4" />
        </Button>
      </header>
      <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Overall progress", `${progressPercent}%`, "chart"],
          [
            "Milestones",
            `${publishedNotes} / ${Math.max(1, totalNotes)} published`,
            "check",
          ],
          ["Research notes", totalNotes, "notes"],
          ["Papers reviewed", project.papers, "paper"],
        ].map(([label, value, icon]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {label}
              </span>
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon name={icon as IconName} className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </section>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,.6fr)]">
        <ModernRoadmapChart
          key={project.id}
          project={project}
          totalNotes={totalNotes}
          publishedNotes={publishedNotes}
        />
        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-300">
            Next milestone
          </p>
          <h2 className="mt-4 text-xl font-bold">Lock evaluation protocol</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Finalize benchmark selection and human review rubric before starting
            full evaluation.
          </p>
          <div className="mt-7 flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-slate-300">
              <Icon name="calendar" className="size-4" />
              Due Apr 29
            </span>
            <div className="flex -space-x-2">
              <Avatar member={members[0] || defaultInitialLeader} size="sm" />
              {members[1] && <Avatar member={members[1]} size="sm" />}
            </div>
          </div>
          <div className="mt-6 border-t border-slate-800 pt-5">
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-slate-400">Milestone progress</span>
              <strong>72%</strong>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-full w-[72%] rounded-full bg-indigo-400" />
            </div>
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="font-bold text-slate-900">Member contributions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Work completed across notes, papers, and roadmap tasks
          </p>
        </div>
        <div className="mt-7 space-y-5">
          {members.map((member) => (
            <div
              key={member.id}
              className="grid items-center gap-3 sm:grid-cols-[180px_1fr_50px]"
            >
              <div className="flex items-center gap-3">
                <Avatar member={member} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{member.role}</p>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-400"
                  style={{ width: `${member.share * 3}%` }}
                />
              </div>
              <span className="text-right text-sm font-bold text-slate-700">
                {member.share}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar member={member} size="sm" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {member.name.split(" ")[0]}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {member.share}% contribution
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <strong className="block text-sm text-slate-800">
                    {member.notes}
                  </strong>
                  <span className="text-[10px] text-slate-400">Notes</span>
                </div>
                <div>
                  <strong className="block text-sm text-slate-800">
                    {member.papers}
                  </strong>
                  <span className="text-[10px] text-slate-400">Papers</span>
                </div>
                <div>
                  <strong className="block text-sm text-slate-800">
                    {member.tasks}
                  </strong>
                  <span className="text-[10px] text-slate-400">Tasks</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function NotesTab({
  notes,
  openNote,
  onCreateNote,
  onTogglePublish,
  onDeleteNote,
  listMode,
}: {
  notes: Note[]
  openNote: (note: Note) => void
  onCreateNote: () => void
  onTogglePublish: (noteId: string | number, isPublished: boolean) => void
  onDeleteNote: (noteId: string | number) => void
  listMode: "mine" | "published"
}) {
  const visibleNotes =
    listMode === "mine"
      ? notes.filter((n) => !n.isPublished)
      : notes.filter((n) => n.isPublished)

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              {listMode === "mine" ? "Your notes" : "Published notes"}
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {visibleNotes.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {listMode === "mine"
              ? "Private personal drafts saved in the database. Visible only to you until published."
              : "Notes published to the PostgreSQL database for all 4 team members."}
          </p>
        </div>
        <Button onClick={onCreateNote}>
          <Icon name="plus" className="size-4" />
          Create Note in Docmost
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visibleNotes.map((note) => (
          <article
            key={note.id}
            className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-3">
                <Avatar member={note.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {note.author.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{note.time}</p>
                </div>
                {note.isPublished ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    PUBLISHED
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                    PERSONAL DRAFT
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 line-clamp-1">
                {note.title || "Untitled Note"}
              </h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                {note.preview || "No preview text recorded yet. Open in Docmost editor to write."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {note.tags.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => openNote(note)}
              >
                <Icon name="notes" className="size-4" />
                Open in Docmost
              </Button>
              <Button
                variant="secondary"
                className="px-3"
                title={note.isPublished ? "Revert to Private" : "Publish to Team"}
                onClick={() => onTogglePublish(note.id, note.isPublished ?? false)}
              >
                <Icon
                  name={note.isPublished ? "lock" : "send"}
                  className="size-4"
                />
                {note.isPublished ? "Unpublish" : "Publish to Team"}
              </Button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Move to Trash"
                onClick={() => onDeleteNote(note.id)}
              >
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </article>
        ))}
      </div>

      {visibleNotes.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon name="notes" />
          </span>
          <h3 className="mt-3 font-bold text-slate-800">
            {listMode === "mine"
              ? "No personal drafts yet"
              : "No published notes yet"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {listMode === "mine"
              ? "Create your first personal research note in Docmost."
              : "Publish a note to share your findings with all 4 team members."}
          </p>
          <div className="mt-4">
            <Button onClick={onCreateNote}>
              <Icon name="plus" className="size-4" />
              Create Note in Docmost
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function PapersTab({
  papers,
  setPapers,
  onPreview,
  onAdd,
  onOpenSplitView,
  onDeletePaper,
}: {
  papers: Paper[]
  setPapers: (papers: Paper[]) => void
  onPreview: (paper: Paper) => void
  onAdd: () => void
  onOpenSplitView?: (paper: Paper) => void
  onDeletePaper?: (paperId: number | string) => void
}) {
  const [search, setSearch] = useState("")
  const visible = papers.filter((paper) =>
    `${paper.title} ${paper.authors}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#f0fdf4]">Paper library</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60">
            {papers.length} papers collected by your team
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] px-3 py-2.5 text-slate-400">
            <Icon name="search" className="size-4" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search papers..."
              className="w-full bg-transparent text-sm text-slate-700 dark:text-[#f0fdf4] outline-none sm:w-44"
            />
          </label>
          <Button onClick={onAdd}>
            <Icon name="plus" className="size-4" />
            Add Paper
          </Button>
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 dark:border-[#1c3327] bg-white dark:bg-[#111f18] py-14 px-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
            <Icon name="paper" className="size-6" />
          </span>
          <h3 className="mt-4 font-bold text-slate-800 dark:text-[#f0fdf4]">
            No research papers collected yet
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500 dark:text-emerald-100/60">
            Upload PDF research papers or add paper URLs to read, organize, and take side-by-side notes with your team.
          </p>
          <div className="mt-5">
            <Button onClick={onAdd}>
              <Icon name="plus" className="size-4" />
              Add Paper
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] shadow-sm">
          <div className="hidden grid-cols-12 gap-4 border-b border-slate-100 dark:border-[#1c3327] bg-slate-50 dark:bg-[#0d1713] px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-100/40 lg:grid">
            <span className="col-span-5">Paper</span>
            <span className="col-span-3">Source</span>
            <span className="col-span-1">Year</span>
            <span className="col-span-1">Date added</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>
          {visible.map((paper) => (
            <div
              key={paper.id}
              className="grid grid-cols-1 gap-4 border-b border-slate-100 dark:border-[#1c3327] p-5 transition last:border-b-0 hover:bg-slate-50/70 dark:hover:bg-[#162820]/70 lg:grid-cols-12 lg:items-center"
            >
              <div
                className="col-span-5 flex gap-3 cursor-pointer group"
                onClick={() => onOpenSplitView ? onOpenSplitView(paper) : onPreview(paper)}
                title="Click to open Split View with Notes"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 group-hover:scale-105 transition">
                  <Icon name="paper" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-5 text-slate-900 dark:text-[#f0fdf4] group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition flex items-center gap-2 flex-wrap">
                    <span className="truncate">{paper.title}</span>
                    {paper.fileSize && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                        PDF · {paper.fileSize}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-emerald-100/60 truncate">{paper.authors}</p>
                </div>
              </div>
              <div className="col-span-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                <Icon name="link" className="size-3.5 shrink-0" />
                <span className="truncate">{paper.source}</span>
              </div>
              <span className="col-span-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {paper.year}
              </span>
              <span className="col-span-1 text-xs text-slate-500 dark:text-slate-400">{paper.added}</span>
              <div className="col-span-2 flex justify-end gap-1.5 items-center">
                {onOpenSplitView && (
                  <button
                    type="button"
                    onClick={() => onOpenSplitView(paper)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-900/80 border border-transparent dark:border-emerald-800/40 transition cursor-pointer"
                    title="Open Note Taking side-by-side with this PDF"
                  >
                    <Icon name="notes" className="size-3.5" />
                    <span>Split</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onPreview(paper)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#16291e] hover:text-slate-600 dark:hover:text-emerald-300 transition cursor-pointer"
                  aria-label={`Preview ${paper.title}`}
                  title="Paper Details"
                >
                  <Icon name="eye" className="size-4" />
                </button>
                {paper.url && paper.url !== "#" && (
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    onClick={() =>
                      setPapers(
                        papers.map((item) =>
                          item.id === paper.id ? { ...item, saved: true } : item,
                        ),
                      )
                    }
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#16291e] hover:text-slate-600 dark:hover:text-emerald-300 transition"
                    aria-label={`Download ${paper.title}`}
                    title="Download"
                  >
                    <Icon name="download" className="size-4" />
                  </a>
                )}
                {onDeletePaper && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeletePaper(paper.id)
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition cursor-pointer"
                    aria-label={`Delete ${paper.title}`}
                    title="Delete Paper"
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function RoadmapTab({
  project,
  phases,
  setPhases,
  onPhasesUpdated,
  onBoardTasksAdded,
}: {
  project?: Project | null
  phases: AppRoadmapPhase[]
  setPhases: (phases: AppRoadmapPhase[]) => void
  onPhasesUpdated?: (phases: RoadmapPhase[], summary?: string) => void
  onBoardTasksAdded?: (tasks: BoardTaskItem[]) => void
}) {
  const overall = phases.length
    ? Math.round(
        phases.reduce((sum, phase) => sum + (phase.progress || 0), 0) / phases.length,
      )
    : 0

  const toggle = (id: number) =>
    setPhases(
      phases.map((phase) =>
        phase.id === id
          ? {
              ...phase,
              done: !phase.done,
              progress: phase.done ? 0 : 100,
            }
          : phase,
      ),
    )

  return (
    <div className="space-y-6">
      {/* AI Roadmap Chatbox */}
      {project && onPhasesUpdated && (
        <AiRoadmapChatbox
          projectId={project.id}
          projectTitle={project.title}
          currentPhases={phases}
          onPhasesUpdated={onPhasesUpdated}
          onBoardTasksAdded={onBoardTasksAdded}
        />
      )}

      {phases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#1c3327] bg-white dark:bg-[#111f18] py-14 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <IconSparkles className="size-6" />
          </span>
          <h2 className="mt-4 font-bold text-slate-800 dark:text-[#f0fdf4]">
            No roadmap phases yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60 max-w-md mx-auto">
            Use the AI Roadmap Chatbox above to describe your research project, paste your syllabus, or outline milestones. Gemini AI will generate the progression graph automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] p-6 shadow-sm xl:sticky xl:top-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-100/40">
              Overall progress
            </p>
            <div
              className="mx-auto mt-5 grid size-44 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#10b981 ${overall * 3.6}deg, #1c3327 0deg)`,
              }}
            >
              <div className="grid size-36 place-items-center rounded-full bg-white dark:bg-[#111f18] text-center">
                <div>
                  <strong className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-[#f0fdf4]">
                    {overall}%
                  </strong>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-emerald-100/60">
                    completed
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 dark:bg-[#0a1410] border border-transparent dark:border-[#1c3327] p-3 text-center">
                <strong className="block text-lg text-slate-900 dark:text-[#f0fdf4]">
                  {phases.filter((phase) => phase.done).length}
                </strong>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-emerald-100/40">
                  PHASES DONE
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-[#0a1410] border border-transparent dark:border-[#1c3327] p-3 text-center">
                <strong className="block text-lg text-slate-900 dark:text-[#f0fdf4]">
                  {phases.length}
                </strong>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-emerald-100/40">
                  MILESTONES
                </span>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 p-4">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                {overall === 100 ? "Project Complete" : "Live Roadmap Active"}
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-700 dark:text-emerald-400/80">
                {overall === 100
                  ? "All research milestones have been accomplished!"
                  : `Currently ${overall}% completed across ${phases.length} defined research phases.`}
              </p>
            </div>
          </aside>
          <section className="rounded-2xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-[#f0fdf4]">
                  Project roadmap
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60">
                  Track each phase from framing to publication. Click milestone numbers to toggle completion.
                </p>
              </div>
            </div>
            <div className="relative ml-4 border-l-2 border-slate-100 dark:border-[#1c3327] pl-8 sm:ml-5 sm:pl-10">
              {phases.map((phase, index) => (
                <div key={phase.id} className="relative pb-8 last:pb-0">
                  <button
                    onClick={() => toggle(phase.id)}
                    className={`absolute -left-[49px] top-0 grid size-8 place-items-center rounded-full border-4 border-white dark:border-[#111f18] shadow-sm transition sm:-left-[57px] cursor-pointer ${
                      phase.done
                        ? "bg-emerald-600 text-white"
                        : phase.progress > 0
                          ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/50"
                          : "bg-slate-100 dark:bg-[#16291e] text-slate-400 dark:text-emerald-100/40"
                    }`}
                    aria-label={`${
                      phase.done ? "Mark incomplete" : "Mark complete"
                    }: ${phase.title}`}
                  >
                    {phase.done ? (
                      <Icon name="check" className="size-4" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </button>
                  <div
                    className={`rounded-2xl border p-5 transition ${
                      phase.done
                        ? "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#0d1813] hover:border-emerald-300 dark:hover:border-emerald-600/40"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-[#f0fdf4]">
                            {phase.title}
                          </h3>
                          {phase.done ? (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              DONE
                            </span>
                          ) : phase.progress > 0 ? (
                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              IN PROGRESS
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 dark:bg-[#16291e] px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-emerald-100/40">
                              UPCOMING
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60">
                          {phase.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {phase.owner && (
                          <>
                            <Avatar member={phase.owner} size="sm" />
                            <span className="text-xs font-semibold text-slate-500 dark:text-emerald-100/60">
                              {phase.owner.name.split(" ")[0]}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Subtasks if generated by AI */}
                    {phase.tasks && phase.tasks.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#1c3327]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-100/40 mb-1.5">
                          Milestone Tasks:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {phase.tasks.map((task) => (
                            <span
                              key={task.id}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 dark:bg-[#16291e] px-2.5 py-1 text-xs text-slate-700 dark:text-emerald-200/90 border border-slate-200/60 dark:border-emerald-800/30"
                            >
                              <span className={`size-1.5 rounded-full ${task.done ? "bg-emerald-500" : "bg-amber-400"}`} />
                              {task.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-400 dark:text-emerald-100/40">
                          <Icon name="calendar" className="size-3.5" />
                          {phase.date}
                        </span>
                        <strong className="text-slate-700 dark:text-emerald-300">
                          {phase.progress}%
                        </strong>
                      </div>
                      <ProgressBar
                        value={phase.progress}
                        color={phase.done ? "bg-emerald-600" : "bg-amber-400"}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function MembersTab({
  members = [defaultInitialLeader],
  team = defaultInitialTeam,
  isLeader = false,
  currentUserId,
  onRemoveMember,
  onCopyTeamId,
  onEditProfile,
}: {
  members?: Member[]
  team?: Team
  isLeader?: boolean
  currentUserId?: string | number
  onRemoveMember?: (id: string | number) => void
  onCopyTeamId?: () => void
  onEditProfile?: () => void
}) {
  const availableSlots = Math.max(0, 6 - members.length)

  const handleConfirmRemove = (member: Member) => {
    modals.openConfirmModal({
      title: "Remove team member?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove <strong>{member.name}</strong> ({member.email}) from the research team? They will lose access to this team workspace.
        </Text>
      ),
      labels: { confirm: "Remove Member", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        onRemoveMember?.(member.id)
      },
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Project team</h2>
          <p className="mt-1 text-sm text-slate-500">
            {members.length} collaborator{members.length === 1 ? "" : "s"} working toward shared outcomes ({members.length}/6 maximum capacity).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCopyTeamId}>
            <Icon name="copy" className="size-4 text-indigo-600" />
            <span>
              Team ID: <code className="font-mono font-bold text-indigo-600">{team.id}</code>
            </span>
          </Button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {members.map((member) => {
          const isThisLeader = member.role === "Team Leader" || member.id === team.leaderId
          const canRemove = isLeader && !isThisLeader
          const isMe = String(member.id) === String(currentUserId)
          return (
            <article
              key={member.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <Avatar member={member} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 truncate">{member.name}</h3>
                    {isThisLeader && (
                      <span className="rounded-full bg-amber-50 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-800/80 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                        Team Leader
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-indigo-600">
                    {member.role}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    {member.email}
                  </p>
                  {(member.batch || member.section) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                      <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/60 dark:border-emerald-800/60 px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300">
                        {member.batch} {member.section ? `· ${member.section}` : ""}
                      </span>
                      {member.isVerified && (
                        <span className="rounded-md bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                          ✓ Verified {member.cgpa ? `(CGPA: ${member.cgpa})` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {isMe && (
                  <button
                    type="button"
                    onClick={onEditProfile}
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/80 cursor-pointer"
                    title="Edit my account & profile"
                  >
                    ✎ Edit
                  </button>
                )}
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleConfirmRemove(member)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 hover:text-rose-800"
                    title={`Remove ${member.name} from team`}
                  >
                    <Icon name="user-minus" className="size-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-medium text-slate-500">
                    Team contribution
                  </span>
                  <strong className="text-slate-800">{member.share}%</strong>
                </div>
                <ProgressBar value={member.share * 3} />
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-3 text-center">
                <div>
                  <strong className="block text-lg text-slate-900">
                    {member.notes}
                  </strong>
                  <span className="text-[10px] text-slate-400">NOTES</span>
                </div>
                <div>
                  <strong className="block text-lg text-slate-900">
                    {member.papers}
                  </strong>
                  <span className="text-[10px] text-slate-400">PAPERS</span>
                </div>
                <div>
                  <strong className="block text-lg text-slate-900">
                    {member.tasks}
                  </strong>
                  <span className="text-[10px] text-slate-400">TASKS</span>
                </div>
              </div>
            </article>
          )
        })}

        {/* Empty slots up to 6 members */}
        {Array.from({ length: availableSlots }).map((_, idx) => (
          <div
            key={`empty-slot-${idx}`}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-6 text-center transition hover:border-indigo-300 hover:bg-indigo-50/20"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-slate-400 shadow-2xs border border-slate-200/80">
              <Icon name="users" className="size-5" />
            </span>
            <h4 className="mt-3 text-sm font-bold text-slate-700">
              Available Team Slot {members.length + idx + 1} of 6
            </h4>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              Share your Team ID with a general member to fill this slot.
            </p>
            <button
              type="button"
              onClick={onCopyTeamId}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <Icon name="copy" className="size-3.5 text-indigo-600" />
              Copy Team ID ({team.id})
            </button>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl bg-slate-950 p-6 text-white">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Team status
            </p>
            <h3 className="mt-2 text-xl font-bold">
              Research Unit Active ({members.length}/6 Members)
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Team workspace is active with {members.length} registered member{members.length === 1 ? "" : "s"}. Leader {team.leaderName} coordinates project deliverables and team membership.
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <strong className="block text-2xl">{members.length}</strong>
              <span className="text-xs text-slate-400">Active / 6 Max</span>
            </div>
            <div>
              <strong className="block text-2xl">{availableSlots}</strong>
              <span className="text-xs text-slate-400">Slots Open</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InteractiveProgressGraph({
  project,
  phases,
  totalNotes = 0,
  publishedNotes = 0,
  onOpenRoadmapChat,
}: {
  project: Project
  phases: AppRoadmapPhase[]
  totalNotes?: number
  publishedNotes?: number
  onOpenRoadmapChat?: () => void
}) {
  const [activePhase, setActivePhase] = useState(0)

  if (phases.length === 0 && (totalNotes === 0 && (!project || project.progress === 0))) {
    return (
      <section className="order-2 mb-7 rounded-3xl border border-dashed border-slate-300 dark:border-[#1c3327] bg-white dark:bg-[#111f18] py-14 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <IconSparkles className="size-6" />
        </span>
        <h2 className="mt-4 font-bold text-slate-800 dark:text-[#f0fdf4]">No progression data yet</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60 max-w-md mx-auto">
          Roadmap progress and milestone completion will update dynamically as you write notes or generate a roadmap with AI.
        </p>
        {onOpenRoadmapChat && (
          <button
            onClick={onOpenRoadmapChat}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition cursor-pointer"
          >
            <IconSparkles className="size-4" />
            Generate Roadmap with Gemini AI
          </button>
        )}
      </section>
    )
  }

  const phase = phases[activePhase] || phases[0] || {
    id: 1,
    title: "Phase 1",
    description: "Initial research setup",
    date: "TBD",
    progress: 0,
    done: false,
    owner: defaultInitialLeader,
  }

  const chartPhases = phases.length > 0
    ? phases.map((item) => ({
        ...item,
        progress: typeof item.progress === "number" ? Math.max(0, Math.min(100, item.progress)) : 0,
      }))
    : [{ ...phase, progress: project?.progress || 0 }]

  const overallProgress = phases.length > 0
    ? Math.round(phases.reduce((sum, p) => sum + (p.progress || 0), 0) / phases.length)
    : (project?.progress || 0)

  const colors = [
    "bg-emerald-500",
    "bg-teal-500",
    "bg-sky-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-amber-400",
    "bg-rose-500",
  ]
  const strokeColors = [
    "#10b981",
    "#14b8a6",
    "#0ea5e9",
    "#6366f1",
    "#8b5cf6",
    "#f59e0b",
    "#f43f5e",
  ]
  const circumference = 326.73

  return (
    <section className="order-2 mb-7 overflow-hidden rounded-3xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-[#1c3327] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Icon name="chart" className="size-4" />
            </span>
            <h2 className="font-bold text-slate-900 dark:text-[#f0fdf4]">Project progression</h2>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-emerald-100/60">
            Real-time milestone progression powered by research roadmap and notes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenRoadmapChat && (
            <button
              onClick={onOpenRoadmapChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
            >
              <IconSparkles className="size-3.5" />
              <span>AI Roadmap Chat</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-emerald-100/60">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-slate-200 dark:bg-[#1c3327]" />
              Remaining
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="border-b border-slate-100 dark:border-[#1c3327] p-6 lg:border-r lg:border-b-0 lg:p-7">
          <div className="relative mx-auto size-56">
            <svg
              viewBox="0 0 120 120"
              className="size-full -rotate-90 drop-shadow-sm"
              role="img"
              aria-label={`${overallProgress}% of the project is complete`}
            >
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-100 dark:text-[#16291e]"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="#10b981"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(overallProgress / 100) * circumference} ${circumference}`}
                className="transition-all duration-700"
              />
              {chartPhases.map((item, index) => {
                const angle = (index / chartPhases.length) * Math.PI * 2
                return (
                  <circle
                    key={item.id || index}
                    cx={60 + Math.cos(angle) * 52}
                    cy={60 + Math.sin(angle) * 52}
                    r={activePhase === index ? 3.7 : 2.6}
                    fill={strokeColors[index % strokeColors.length]}
                    stroke="white"
                    strokeWidth="1.5"
                    className="transition-all"
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <strong className="block text-4xl font-extrabold tracking-tight text-slate-950 dark:text-[#f0fdf4]">
                  {overallProgress}%
                </strong>
                <span className="mt-1 block text-xs font-semibold text-slate-400 dark:text-emerald-100/40">
                  TOTAL COMPLETE
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-5 gap-1.5">
            {chartPhases.map((item, index) => (
              <button
                key={item.id || index}
                onClick={() => setActivePhase(index)}
                className={`h-2 rounded-full transition-all cursor-pointer ${colors[index % colors.length]} ${
                  activePhase === index
                    ? "scale-y-150 shadow-sm"
                    : "opacity-35 hover:opacity-70"
                }`}
                aria-label={`Show ${item.title}`}
              />
            ))}
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-emerald-100/60">
            {phases.filter((item) => item.done).length} of {phases.length}{" "}
            phases complete · Real-time graph sync
          </p>
        </div>

        <div className="min-w-0 p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-100/40">
                Milestone completion
              </p>
              <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-[#f0fdf4]">
                Work completed by phase
              </h3>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0a1410] border border-transparent dark:border-[#1c3327] px-3 py-2 text-right">
              <span className="block text-[10px] font-semibold text-slate-400 dark:text-emerald-100/40">
                SELECTED
              </span>
              <strong className="text-sm text-slate-800 dark:text-emerald-400">
                {chartPhases[activePhase]?.progress ?? 0}%
              </strong>
            </div>
          </div>

          <div className="relative mt-7 h-52 border-b border-slate-200 dark:border-[#1c3327]">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {[100, 75, 50, 25, 0].map((value) => (
                <div key={value} className="flex items-center gap-3">
                  <span className="w-6 text-right text-[9px] font-medium text-slate-400 dark:text-emerald-100/40">
                    {value}
                  </span>
                  <span className="h-px flex-1 bg-slate-100 dark:bg-[#1c3327]" />
                </div>
              ))}
            </div>
            <div className="absolute inset-y-0 right-1 left-10 flex items-end justify-around gap-3 px-2">
              {chartPhases.map((item, index) => (
                <button
                  key={item.id || index}
                  onClick={() => setActivePhase(index)}
                  onMouseEnter={() => setActivePhase(index)}
                  className="group flex h-full flex-1 items-end justify-center cursor-pointer"
                  aria-label={`${item.title}: ${item.progress}% complete`}
                >
                  <span
                    className={`relative w-full max-w-16 rounded-t-xl transition-all duration-300 ${colors[index % colors.length]} ${
                      activePhase === index
                        ? "opacity-100 shadow-lg shadow-emerald-500/20"
                        : "opacity-55 group-hover:opacity-90"
                    }`}
                    style={{ height: `${Math.max(item.progress, 6)}%` }}
                  >
                    <span
                      className={`absolute -top-8 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 dark:bg-[#16291e] border border-transparent dark:border-[#1c3327] px-2 py-1 text-[10px] font-bold whitespace-nowrap text-white transition ${
                        activePhase === index
                          ? "translate-y-0 opacity-100"
                          : "translate-y-1 opacity-0"
                      }`}
                    >
                      {item.progress}% complete
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="ml-10 flex justify-around gap-2 pt-3 text-center">
            {chartPhases.map((item, index) => (
              <button
                key={item.id || index}
                onClick={() => setActivePhase(index)}
                className={`flex-1 text-[10px] font-semibold transition cursor-pointer truncate ${
                  activePhase === index
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-slate-400 dark:text-emerald-100/40"
                }`}
              >
                P{index + 1}: {item.title.split(" ")[0]}
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-100 dark:border-[#1c3327] bg-slate-50 dark:bg-[#0a1410] p-4 sm:flex-row sm:items-center">
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${colors[activePhase % colors.length]}`}
            >
              <span className="text-sm font-extrabold">{activePhase + 1}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-800 dark:text-[#f0fdf4]">{phase.title}</p>
                {phase.done && (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    COMPLETED
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-emerald-100/60">
                {phase.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {phase.owner && (
                <>
                  <Avatar member={phase.owner} size="sm" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-emerald-100/60">
                    {phase.date}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrashView({
  trashedProjects,
  trashedNotes,
  onRestore,
  onPermanentDelete,
  onRestoreNote,
  onPermanentDeleteNote,
  onEmptyTrash,
  onBack,
}: {
  trashedProjects: Project[]
  trashedNotes: Array<{ id: string; title: string; deletedAt?: string | Date | null; slugId?: string }>
  onRestore: (projectId: number) => void
  onPermanentDelete: (projectId: number) => void
  onRestoreNote: (noteId: string) => void
  onPermanentDeleteNote: (noteId: string) => void
  onEmptyTrash: () => void
  onBack: () => void
}) {
  const totalTrashItems = trashedProjects.length + trashedNotes.length
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-indigo-600"
        >
          <Icon name="arrow" className="size-3.5 rotate-180" />
          Back to Dashboard
        </button>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <Icon name="trash" className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Trash
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {totalTrashItems === 0
                  ? "Trash is empty."
                  : `${totalTrashItems} deleted ${
                      totalTrashItems === 1 ? "item" : "items"
                    } can be restored or permanently removed.`}
              </p>
            </div>
          </div>
          {totalTrashItems > 0 && (
            <button
              onClick={onEmptyTrash}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100/70"
            >
              <Icon name="trash" className="size-4" />
              Empty Trash
            </button>
          )}
        </div>
      </div>

      {totalTrashItems === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-slate-50 text-slate-400">
            <Icon name="trash" className="size-8" />
          </span>
          <h3 className="mt-4 text-base font-bold text-slate-800">
            Trash is empty
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            No projects or notes have been moved to trash.
          </p>
          <Button className="mt-6" onClick={onBack}>
            <Icon name="home" className="size-4" />
            Go to Dashboard
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Trashed Notes Section */}
          {trashedNotes.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Icon name="notes" className="size-4 text-amber-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Deleted Notes ({trashedNotes.length})
                </h2>
              </div>
              <div className="space-y-3">
                {trashedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                          <Icon name="notes" className="size-4" />
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800 line-through opacity-80 sm:text-base">
                              {note.title || "Untitled Note"}
                            </h3>
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                              In Trash
                            </span>
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Note
                            </span>
                          </div>
                          {note.deletedAt && (
                            <p className="mt-0.5 text-xs text-rose-500 font-medium">
                              Moved to trash on{" "}
                              {new Date(note.deletedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestoreNote(note.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-800"
                          title="Restore note"
                        >
                          <Icon name="restore" className="size-4" />
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentDeleteNote(note.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          title="Permanently delete note"
                        >
                          <Icon name="trash" className="size-4" />
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Projects Section */}
          {trashedProjects.length > 0 && (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Icon name="folder" className="size-4 text-indigo-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Deleted Projects ({trashedProjects.length})
                </h2>
              </div>
              <div className="space-y-3">
                {trashedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <span
                          className={`mt-1 block h-10 w-1.5 shrink-0 rounded-full opacity-60 ${project.color}`}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="text-base font-bold text-slate-800 line-through opacity-80 sm:text-lg">
                              {project.title}
                            </h3>
                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                              In Trash
                            </span>
                          </div>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                            {project.description}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            <span>Created {project.created}</span>
                            {project.deletedAt && (
                              <span className="text-rose-500 font-medium">
                                Moved to trash on {project.deletedAt}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestore(project.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-800"
                          title="Restore project to active dashboard"
                        >
                          <Icon name="restore" className="size-4" />
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentDelete(project.id)}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                          title="Permanently remove project and all contents"
                        >
                          <Icon name="trash" className="size-4" />
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

function Workspace({
  project,
  tab,
  setTab,
  notes,
  onCreateNote,
  onTogglePublish,
  onDeleteNote,
  onMoveToTrash,
  papers,
  setPapers,
  phases,
  setPhases,
  onPhasesUpdated,
  onBoardTasksAdded,
  onBack,
  openNote,
  previewPaper,
  addPaper,
  onReadPaper,
  onOpenSplitView,
  onDeletePaper,
  yourNotesCount = 0,
  publishedNotesCount = 0,
  members = [defaultInitialLeader],
  team = defaultInitialTeam,
  isLeader = false,
  currentUserId,
  onRemoveMember,
  onCopyTeamId,
  onOpenAccountSettings,
}: {
  project: Project
  tab: Tab
  setTab: (tab: Tab) => void
  notes: Note[]
  onCreateNote: () => void
  onTogglePublish: (noteId: string | number, isPublished: boolean) => void
  onDeleteNote: (noteId: string | number) => void
  onMoveToTrash: (project: Project) => void
  papers: Paper[]
  setPapers: (papers: Paper[]) => void
  phases: AppRoadmapPhase[]
  setPhases: (phases: AppRoadmapPhase[]) => void
  onPhasesUpdated?: (phases: RoadmapPhase[], summary?: string) => void
  onBoardTasksAdded?: (tasks: BoardTaskItem[]) => void
  onBack: () => void
  openNote: (note: Note) => void
  previewPaper: (paper: Paper) => void
  addPaper: () => void
  onReadPaper?: (paper: Paper) => void
  onOpenSplitView?: (paper: Paper) => void
  onDeletePaper?: (paperId: number | string) => void
  yourNotesCount?: number
  publishedNotesCount?: number
  members?: Member[]
  team?: Team
  isLeader?: boolean
  currentUserId?: string | number
  onRemoveMember?: (id: string | number) => void
  onCopyTeamId?: () => void
  onOpenAccountSettings?: () => void
}) {
  const [noteListMode, setNoteListMode] = useState<"mine" | "published">(
    "mine",
  )
  const overall = project.progress ?? 0
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "notes", label: "Notes", icon: "notes" },
    { id: "papers", label: "Papers", icon: "paper" },
    { id: "roadmap", label: "Roadmap", icon: "chart" },
    { id: "members", label: "Members", icon: "users" },
  ]
  return (
    <main>
      <div className="border-b border-slate-200 bg-white px-5 pt-7 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1500px]">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-indigo-600"
          >
            <Icon name="arrow" className="size-3.5 rotate-180" />
            All projects
          </button>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className={`size-2.5 rounded-full ${project.color}`} />
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
                  {project.title}
                </h1>
                <ProjectActionMenu
                  project={project}
                  onMoveToTrash={onMoveToTrash}
                  align="left"
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Collaborative research workspace
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400">
                  Overall progress
                </p>
                <p className="text-sm font-bold text-slate-800">
                  {overall}% complete
                </p>
              </div>
              <AvatarStack />
            </div>
          </div>
          <div role="tablist" className="mt-7 flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                  tab === item.id
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-900"
                }`}
              >
                <Icon name={item.icon} className="size-4" />
                {item.label}
                {item.id === "notes" && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px]">
                    {notes.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1500px] flex-col px-5 py-7 sm:px-8 lg:px-10">
        {(tab === "progress" || tab === "roadmap") && (
          <InteractiveProgressGraph
            project={project}
            phases={phases}
            totalNotes={notes.length}
            publishedNotes={publishedNotesCount}
            onOpenRoadmapChat={() => setTab("roadmap")}
          />
        )}
        <section className="order-1 mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() => {
              setTab("notes")
              setNoteListMode("mine")
            }}
            className="group flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon name="lock" className="size-5" />
            </span>
            <span>
              <strong className="block text-2xl text-slate-950">
                {notes.filter((n) => !n.isPublished).length}
              </strong>
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                Your notes
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                Drafts stay private until published
              </span>
            </span>
          </button>
          <button
            onClick={() => {
              setTab("notes")
              setNoteListMode("published")
            }}
            className="group flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="users" className="size-5" />
            </span>
            <span>
              <strong className="block text-2xl text-slate-950">
                {notes.filter((n) => n.isPublished).length}
              </strong>
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                Published notes
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                Visible to all {members.length} team member{members.length === 1 ? "" : "s"}
              </span>
            </span>
          </button>
          <button
            onClick={() => setTab("papers")}
            className="group flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-500">
              <Icon name="download" className="size-5" />
            </span>
            <span>
              <strong className="block text-2xl text-slate-950">
                {papers.filter((paper) => paper.saved).length}
              </strong>
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                Shared PDFs
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                Source-linked and available to the team
              </span>
            </span>
          </button>
          <button
            onClick={() => setTab("progress")}
            className="group order-first flex min-h-36 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Icon name="chart" className="size-5" />
            </span>
            <span>
              <strong className="block text-2xl text-slate-950">
                {project.progress}%
              </strong>
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                Progression graph
              </span>
              <span className="mt-1 block text-xs text-slate-400">
                View work completed over time
              </span>
            </span>
          </button>
            </section>
        <div className="order-3">
          {tab === "notes" && (
            <NotesTab
              notes={notes}
              openNote={openNote}
              onCreateNote={onCreateNote}
              onTogglePublish={onTogglePublish}
              onDeleteNote={onDeleteNote}
              listMode={noteListMode}
            />
          )}
          {tab === "papers" && (
            <PapersTab
              papers={papers}
              setPapers={setPapers}
              onPreview={previewPaper}
              onAdd={addPaper}
              onOpenSplitView={onOpenSplitView}
              onDeletePaper={onDeletePaper}
            />
          )}
          {tab === "roadmap" && (
            <RoadmapTab
              project={project}
              phases={phases}
              setPhases={setPhases}
              onPhasesUpdated={onPhasesUpdated}
              onBoardTasksAdded={onBoardTasksAdded}
            />
          )}
          {tab === "members" && (
            <MembersTab
              members={members}
              team={team}
              isLeader={isLeader}
              currentUserId={currentUserId}
              onRemoveMember={onRemoveMember}
              onCopyTeamId={onCopyTeamId}
              onEditProfile={onOpenAccountSettings}
            />
          )}
        </div>
      </div>
    </main>
  )
}

export function ResearchLandingPage({
  onEnter,
  onLeaderRegistered,
  onMemberJoined,
}: {
  onEnter: () => void
  onLeaderRegistered?: (leader: { name: string; email: string; teamId: string }) => void
  onMemberJoined?: (member: { name: string; email: string; teamId: string }) => void
}) {
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null)
  const [authStep, setAuthStep] = useState<"role" | "form" | "referral">("role")
  const [accountType, setAccountType] = useState<"leader" | "member" | null>(
    null,
  )
  const [studentId, setStudentId] = useState("")
  const [studentIdStatus, setStudentIdStatus] = useState<
    "idle" | "checking" | "verified"
  >("idle")
  const [verifiedStudent, setVerifiedStudent] = useState<{
    studentId: string
    name: string
    cgpa?: number
    totalCreditsEarned?: number
    status?: string
  } | null>(null)
  const [fullName, setFullName] = useState("")
  const [accountEmail, setAccountEmail] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [otpVerified, setOtpVerified] = useState(false)
  const [password, setPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")
  const [generatedCode, setGeneratedCode] = useState("")
  const [codeCopied, setCodeCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const gateVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!authMode) return
    setAuthStep(authMode === "login" ? "form" : "role")
    setAccountType(authMode === "login" ? "leader" : null)
    setStudentId("")
    setStudentIdStatus("idle")
    setVerifiedStudent(null)
    setFullName("")
    setAccountEmail("")
    setOtpSent(false)
    setOtpCode("")
    setOtpVerified(false)
    setPassword("")
    setReferralCode("")
    setGeneratedCode("")
    setCodeCopied(false)
    setIsSubmitting(false)
  }, [authMode])

  useEffect(() => {
    const video = gateVideoRef.current
    if (!video) return
    const handleScroll = () => {
      const scrollPosition = Number.isFinite(window.scrollY) ? window.scrollY : 0
      const measuredHeight =
        Number.isFinite(window.innerHeight) && window.innerHeight > 0
          ? window.innerHeight
          : document.documentElement.clientHeight
      const viewportHeight =
        Number.isFinite(measuredHeight) && measuredHeight > 0
          ? measuredHeight
          : 1
      const rawProgress = scrollPosition / (viewportHeight * 0.72)
      const progress = Number.isFinite(rawProgress)
        ? Math.min(1, Math.max(0, rawProgress))
        : 0
      document.documentElement.style.setProperty(
        "--gate-progress",
        String(progress),
      )
      if (progress > 0.015 && video.paused) {
        video.play().catch(() => undefined)
      }
      if (progress < 0.005 && video.currentTime > 0.1) {
        video.pause()
        video.currentTime = 0
      }
      const playbackRate = 0.72 + progress * 0.38
      if (Number.isFinite(playbackRate)) {
        video.playbackRate = playbackRate
      }
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      document.documentElement.style.removeProperty("--gate-progress")
    }
  }, [])

  const handleVerifyStudentId = async () => {
    const cleanId = studentId.trim()
    if (!cleanId || studentIdStatus === "checking") return
    setStudentIdStatus("checking")
    try {
      const res: any = await api.post("/research/verify-student", {
        studentId: cleanId,
      })
      const isSuccess = res?.success ?? res?.data?.success
      const student = res?.student ?? res?.data?.student
      if (isSuccess && student) {
        setStudentIdStatus("verified")
        setVerifiedStudent(student)
        if (student.name) {
          setFullName(student.name)
        }
        if (
          authMode === "signup" &&
          accountType === "leader" &&
          cleanId !== "0272320005101220" &&
          !cleanId.endsWith("0272320005101220")
        ) {
          notifications.show({
            title: "Leader Account Restricted",
            message: `Verified: ${student.name}. However, only student ID 0272320005101220 may create a Team Leader account. Please select General Member.`,
            color: "yellow",
            autoClose: 9000,
          })
        } else {
          notifications.show({
            title: "Student ID Verified",
            message: `Official record verified: ${student.name} (CGPA: ${student.cgpa || "N/A"})`,
            color: "green",
          })
        }
      } else {
        setStudentIdStatus("idle")
        notifications.show({
          title: "Verification Failed",
          message: "Student record was not found.",
          color: "red",
        })
      }
    } catch (err: any) {
      setStudentIdStatus("idle")
      setVerifiedStudent(null)
      const errorMsg =
        err?.response?.data?.message ||
        `Student ID "${cleanId}" is not in the university records. Only authorized students can register.`
      notifications.show({
        title: "Student ID Not Found",
        message: errorMsg,
        color: "red",
        autoClose: 7000,
      })
    }
  }

  const handleSendOtp = async () => {
    const cleanEmail = accountEmail.trim()
    const cleanId = studentId.trim()
    if (!cleanEmail || !cleanId) {
      notifications.show({
        title: "Missing Information",
        message: "Please enter your Student ID and Institutional Email.",
        color: "yellow",
      })
      return
    }
    setIsSubmitting(true)
    try {
      const res: any = await api.post("/research/send-otp", {
        email: cleanEmail,
        studentId: cleanId,
      })
      const otp = res?.otpCode ?? res?.data?.otpCode
      setOtpSent(true)
      notifications.show({
        title: "6-Digit OTP Sent",
        message: `Verification code: ${otp || "Sent"} (Valid for 10 minutes). Stored in database.`,
        color: "blue",
        autoClose: 15000,
      })
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || "Failed to generate OTP code."
      notifications.show({
        title: "Failed to Send OTP",
        message: errorMsg,
        color: "red",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async () => {
    const cleanEmail = accountEmail.trim()
    const cleanCode = otpCode.trim()
    if (cleanCode.length !== 6) {
      notifications.show({
        title: "Incomplete Code",
        message: "Please enter the complete 6-digit verification code.",
        color: "yellow",
      })
      return
    }
    setIsSubmitting(true)
    try {
      await api.post("/research/verify-otp", {
        email: cleanEmail,
        otpCode: cleanCode,
      })
      setOtpVerified(true)
      notifications.show({
        title: "OTP Verified",
        message: "Email verification successful.",
        color: "green",
      })
    } catch (err: any) {
      setOtpVerified(false)
      const errorMsg =
        err?.response?.data?.message || "Invalid or expired OTP code."
      notifications.show({
        title: "OTP Verification Failed",
        message: errorMsg,
        color: "red",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!studentId.trim() || !password.trim()) {
      notifications.show({
        title: "Missing Fields",
        message: "Please enter your Student ID and Password.",
        color: "yellow",
      })
      return
    }

    if (authMode === "signup") {
      if (!accountType) return
      if (studentIdStatus !== "verified") {
        notifications.show({
          title: "Student ID Not Verified",
          message: "Please verify your Student ID against university records first.",
          color: "yellow",
        })
        return
      }
      if (!fullName.trim() || !accountEmail.trim()) {
        notifications.show({
          title: "Missing Information",
          message: "Please provide your full name and institutional email.",
          color: "yellow",
        })
        return
      }
      if (!otpVerified) {
        notifications.show({
          title: "OTP Verification Required",
          message: "Please verify the 6-digit email OTP before creating your account.",
          color: "yellow",
        })
        return
      }
      if (accountType === "member" && !referralCode.trim()) {
        notifications.show({
          title: "Team ID Required",
          message: "General members must specify a Team ID to join.",
          color: "yellow",
        })
        return
      }
      if (password.length < 6) {
        notifications.show({
          title: "Password Too Short",
          message: "Password must be at least 6 characters long.",
          color: "yellow",
        })
        return
      }

      if (accountType === "leader") {
        const cleanId = studentId.trim()
        const LEADER_ID = "0272320005101220"
        if (cleanId !== LEADER_ID && !cleanId.endsWith(LEADER_ID)) {
          notifications.show({
            title: "Leader Account Restricted",
            message:
              "Only authorized student ID 0272320005101220 (Md Sabbir Ahmed) is permitted to create a Team Leader account. Please select 'General Member' to join with a Team ID.",
            color: "red",
            autoClose: 8000,
          })
          return
        }
      }

      setIsSubmitting(true)
      try {
        const leaderTeamCode =
          accountType === "leader"
            ? `0X7-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`
            : undefined

        const teamIdToUse =
          accountType === "leader" ? leaderTeamCode : referralCode.trim()

        const res: any = await api.post("/research/register", {
          studentId: studentId.trim(),
          name: fullName.trim(),
          email: accountEmail.trim(),
          password: password.trim(),
          role: accountType === "leader" ? "Team Leader" : "Researcher",
          teamId: teamIdToUse,
        })

        const user = res?.user ?? res?.data?.user
        if (!user) {
          throw new Error("Unable to retrieve user details from server.")
        }
        const userProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          role: user.role === "Team Leader" ? "Team Leader" : "General Member",
          cgpa: user.cgpa,
          credits: user.credits,
          isVerified: true,
          teamId: user.teamId,
        }
        localStorage.setItem("0x7_user_profile", JSON.stringify(userProfile))
        localStorage.setItem("0x7_research_auth_user", JSON.stringify(user))

        notifications.show({
          title: "Registration Successful",
          message: `Account created for ${user.name} (${user.role}).`,
          color: "green",
        })

        if (accountType === "leader") {
          setGeneratedCode(teamIdToUse!)
          setAuthStep("referral")
          onLeaderRegistered?.({
            name: user.name,
            email: user.email,
            teamId: teamIdToUse!,
          })
        } else {
          onMemberJoined?.({
            name: user.name,
            email: user.email,
            teamId: teamIdToUse!,
          })
          onEnter()
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          "Failed to create account. Please try again."
        notifications.show({
          title: "Registration Failed",
          message: errorMsg,
          color: "red",
          autoClose: 7000,
        })
      } finally {
        setIsSubmitting(false)
      }
    } else if (authMode === "login") {
      setIsSubmitting(true)
      try {
        const res: any = await api.post("/research/login", {
          studentId: studentId.trim(),
          password: password.trim(),
        })

        const user = res?.user ?? res?.data?.user
        if (!user) {
          throw new Error("Unable to retrieve user details from server.")
        }
        const userProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          role: user.role === "Team Leader" ? "Team Leader" : "General Member",
          cgpa: user.cgpa,
          credits: user.credits,
          isVerified: true,
          teamId: user.teamId,
        }
        localStorage.setItem("0x7_user_profile", JSON.stringify(userProfile))
        localStorage.setItem("0x7_research_auth_user", JSON.stringify(user))

        notifications.show({
          title: "Login Successful",
          message: `Welcome back, ${user.name}!`,
          color: "green",
        })

        onEnter()
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message ||
          "Incorrect Student ID or password. Please verify and try again."
        notifications.show({
          title: "Login Failed",
          message: errorMsg,
          color: "red",
          autoClose: 7000,
        })
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="landing-shell min-h-screen overflow-hidden text-slate-900">
      <video
        ref={gateVideoRef}
        className="landing-gate-video fixed inset-0 z-0 size-full object-cover"
        muted
        playsInline
        preload="auto"
      >
        <source src={gateBackgroundVideo} type="video/mp4" />
      </video>
      <div className="landing-video-overlay fixed inset-0 z-0" />
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-grid" />

      <header className="landing-nav absolute inset-x-0 top-0 z-30 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <button className="flex items-center gap-3" aria-label="0x7 Research home">
          <img
            src={researchLogo}
            alt="0x7 Research logo"
            className="size-11 rounded-2xl object-cover shadow-lg shadow-indigo-500/10"
          />
          <span className="brand-wordmark bg-gradient-to-r from-slate-950 via-indigo-700 to-teal-500 bg-clip-text text-lg font-bold whitespace-nowrap text-transparent">
            <span className="brand-code">0x7</span> Research Center
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuthMode("login")}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white/60 hover:text-slate-950"
          >
            Log in
          </button>
          <button
            onClick={() => setAuthMode("signup")}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            Create account
          </button>
        </div>
      </header>

      <section className="landing-video-stage relative z-10 h-[135vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center px-5 text-center">
          <div className="landing-opening-message absolute top-1/2 left-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 px-6">
            <span className="text-[10px] font-bold tracking-[0.24em] text-indigo-600 uppercase">
              A principle for every researcher
            </span>
            <p className="mt-5 text-2xl leading-relaxed font-semibold tracking-tight text-slate-900 sm:text-4xl sm:leading-snug">
              “Stay curious. Question deeply. Document honestly. The best
              research begins when we learn to ask{" "}
              <span className="landing-gradient-text font-bold">better questions.</span>”
            </p>
            <div className="mx-auto mt-7 h-px w-20 bg-gradient-to-r from-transparent via-indigo-400 to-transparent" />
          </div>
          <div className="landing-welcome max-w-5xl">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-indigo-700 shadow-sm backdrop-blur-xl">
              <Icon name="spark" className="size-3.5" />
              Ideas · Experiments · Insights · Impact
            </span>
            <h1 className="mt-7 text-5xl leading-[.95] font-extrabold tracking-[-0.06em] text-slate-950 sm:text-7xl lg:text-8xl">
              Welcome to Our{" "}
              <span className="landing-gradient-text">Research Club</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Scroll to open the gate and enter a collaborative space built for
              curious minds.
            </p>
          </div>
          <div className="landing-scroll-cue absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-center">
            <span className="relative flex h-10 w-6 justify-center rounded-full border border-slate-300 bg-white/70 pt-2 shadow-xs backdrop-blur-lg">
              <span className="landing-mouse-dot size-1.5 rounded-full bg-indigo-600" />
            </span>
            <span className="whitespace-nowrap text-[10px] font-bold tracking-[0.18em] text-slate-700 uppercase">
              Scroll down to open the gate
            </span>
            <span className="text-[9px] font-medium text-slate-400">
              Use your mouse wheel or swipe up
            </span>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto grid min-h-screen max-w-[1440px] items-center gap-14 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)] lg:px-12 lg:py-20">
        <section className="max-w-2xl">
          <div className="landing-badge inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 backdrop-blur-xl">
            <Icon name="spark" className="size-3.5" />
            Research, organized beautifully
          </div>
          <h1 className="landing-hero-title mt-7 text-5xl leading-[1.02] font-extrabold tracking-[-0.055em] text-slate-950 sm:text-6xl xl:text-7xl">
            Turn shared ideas into{" "}
            <span className="landing-gradient-text">meaningful impact.</span>
          </h1>
          <p className="landing-subtitle mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            One focused workspace for small research teams to collect papers,
            develop notes, share decisions, and move every project forward.
          </p>
          <div className="landing-actions mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setAuthMode("signup")}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700"
            >
              Create your workspace
              <Icon
                name="arrow"
                className="size-4 transition group-hover:translate-x-1"
              />
            </button>
            <button
              onClick={() => setAuthMode("login")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm backdrop-blur-xl transition hover:bg-white hover:text-slate-950"
            >
              I already have an account
            </button>
          </div>
          <div className="landing-features mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-500">
            {["Built for 6-person teams", "Private drafts", "Shared paper library"].map(
              (item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-full border border-emerald-200/60 bg-emerald-50 text-emerald-600">
                    <Icon name="check" className="size-3" />
                  </span>
                  {item}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="landing-preview relative mx-auto w-full max-w-3xl">
          <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-r from-indigo-500/15 to-teal-400/12 blur-3xl" />
          <div className="landing-glass-card relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 p-3 shadow-2xl shadow-indigo-950/8 backdrop-blur-2xl">
            <span className="landing-shine pointer-events-none absolute inset-y-0 -left-1/2 z-10 w-1/3 skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-400" />
                    <span className="size-2.5 rounded-full bg-amber-400" />
                    <span className="size-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Team research workspace
                  </span>
                </div>
                <div className="landing-avatars flex -space-x-2">
                  {members.map((member) => (
                    <Avatar key={member.id} member={member} size="sm" />
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1.15fr]">
                <div className="space-y-4">
                  <div className="landing-mini-card rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-slate-500">
                        PROJECT PROGRESS
                      </span>
                      <span className="text-xs font-bold text-indigo-600">64%</span>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="relative grid size-20 place-items-center">
                        <div className="landing-progress-ring absolute inset-0 rounded-full bg-[conic-gradient(#4f46e5_0_64%,#e2e8f0_64%_100%)]" />
                        <div className="absolute inset-2 rounded-full bg-white" />
                        <strong className="relative text-lg text-slate-900">64%</strong>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Language model safety</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Evaluation phase
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="landing-mini-card rounded-2xl border border-indigo-100 bg-indigo-50/80 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                      <span className="grid size-7 place-items-center rounded-lg bg-indigo-600 text-white">
                        <Icon name="spark" className="size-3.5" />
                      </span>
                      Team notice
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      Review the benchmark shortlist before Thursday’s sync.
                    </p>
                  </div>
                </div>

                <div className="landing-mini-card rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Research velocity</p>
                      <p className="text-[10px] text-slate-500">Last 8 weeks</p>
                    </div>
                    <span className="rounded-full border border-emerald-200/60 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      +18%
                    </span>
                  </div>
                  <svg viewBox="0 0 280 150" className="mt-5 h-40 w-full">
                    <defs>
                      <linearGradient id="landing-chart" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity=".2" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[35, 75, 115].map((y) => (
                      <line
                        key={y}
                        x1="8"
                        y1={y}
                        x2="272"
                        y2={y}
                        stroke="#cbd5e1"
                        strokeOpacity=".6"
                        strokeDasharray="3 5"
                      />
                    ))}
                    <path
                      d="M10 126 C45 118 58 110 88 106 C120 102 126 85 158 82 C192 78 207 54 232 48 C250 44 260 30 272 24 L272 140 L10 140Z"
                      fill="url(#landing-chart)"
                      className="landing-chart-area"
                    />
                    <path
                      d="M10 126 C45 118 58 110 88 106 C120 102 126 85 158 82 C192 78 207 54 232 48 C250 44 260 30 272 24"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className="landing-chart-line"
                    />
                    {[["10", "126"], ["88", "106"], ["158", "82"], ["232", "48"], ["272", "24"]].map(
                      ([cx, cy]) => (
                        <circle
                          key={cx}
                          cx={cx}
                          cy={cy}
                          r="4"
                          fill="#ffffff"
                          stroke="#4f46e5"
                          strokeWidth="2"
                          className="landing-chart-point"
                        />
                      ),
                    )}
                  </svg>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[
                      ["12", "Notes"],
                      ["8", "Papers"],
                      ["9", "Tasks"],
                    ].map(([value, label]) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200/60 bg-white px-2 py-2 text-center"
                      >
                        <strong className="block text-sm text-slate-900">{value}</strong>
                        <span className="text-[9px] text-slate-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/60 px-5 py-7 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] justify-end sm:px-3 lg:px-7">
          <div className="border-r-2 border-indigo-300 pr-4 text-right">
            <p className="text-[9px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
              Created by
            </p>
            <p className="identity-signature mt-1 text-lg text-slate-800">
              Sabbir Ahmed
            </p>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-500">
              63rd Batch · Section C
            </p>
          </div>
        </div>
      </footer>


      {authMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setAuthMode(null)
          }
        >
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-slate-200/90 bg-white/95 p-6 text-slate-900 shadow-2xl shadow-indigo-950/15 backdrop-blur-2xl sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <img
                  src={researchLogo}
                  alt="0x7 Research logo"
                  className="size-11 rounded-2xl object-cover shadow-sm shadow-indigo-500/10"
                />
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950">
                  {authStep === "referral"
                    ? "Your team is ready"
                    : authMode === "login"
                      ? "Log in"
                      : "Create Account"}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  {authStep === "referral"
                    ? "Invite your members with this referral code."
                    : authStep === "role"
                      ? "Choose your account type"
                      : accountType === "leader"
                        ? "Continue as a team leader"
                        : "Continue as a general member"}
                </p>
              </div>
              <button
                onClick={() => setAuthMode(null)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <Icon name="close" />
              </button>
            </div>

            {authStep === "role" && (
              <div className="mt-7 space-y-3">
                {[
                  {
                    id: "leader" as const,
                    title: "Team Leader",
                    description:
                      authMode === "signup"
                        ? "Create research team (Exclusive to ID: 0272320005101220)"
                        : "Log in as Team Leader",
                    icon: "spark" as IconName,
                  },
                  {
                    id: "member" as const,
                    title: "General Member",
                    description:
                      authMode === "signup"
                        ? "Join with Team ID (Max 6 members)"
                        : "Log in to your team workspace",
                    icon: "users" as IconName,
                  },
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setAccountType(role.id)}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition ${
                      accountType === role.id
                        ? "border-indigo-600 bg-indigo-50/80 shadow-md shadow-indigo-100"
                        : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/70"
                    }`}
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                        accountType === role.id
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200/70 text-slate-600"
                      }`}
                    >
                      <Icon name={role.icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm font-bold text-slate-900">
                        {role.title}
                      </strong>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {role.description}
                      </span>
                    </span>
                    {accountType === role.id && (
                      <span className="grid size-6 place-items-center rounded-full bg-indigo-100 text-indigo-700">
                        <Icon name="check" className="size-3.5" />
                      </span>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => accountType && setAuthStep("form")}
                  disabled={!accountType}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40"
                >
                  Continue
                  <Icon name="arrow" className="size-4" />
                </button>
              </div>
            )}

            {authStep === "form" && (authMode === "login" || accountType) && (
              <form onSubmit={submitAuth} className="mt-7 space-y-4">
                {authMode === "signup" && (
                  <button
                    type="button"
                    onClick={() => setAuthStep("role")}
                    className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
                  >
                    <Icon name="arrow" className="size-3.5 rotate-180" />
                    Change account type
                  </button>
                )}
                {authMode === "signup" && accountType && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Icon
                          name={accountType === "leader" ? "spark" : "users"}
                          className="size-3.5"
                        />
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {accountType === "leader" ? "Team Leader" : "General Member"}
                      </span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold text-slate-700">
                    {authMode === "login"
                      ? "Student ID or Email"
                      : "Student ID"}
                  </span>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={studentId}
                      onChange={(event) => {
                        setStudentId(event.target.value)
                        setStudentIdStatus("idle")
                        setVerifiedStudent(null)
                        setOtpSent(false)
                        setOtpVerified(false)
                      }}
                      placeholder={
                        authMode === "login"
                          ? "e.g. 0272320005101220 or email"
                          : "e.g. 0272320005101220"
                      }
                      autoComplete="username"
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    {authMode === "signup" && (
                      <button
                        type="button"
                        disabled={
                          studentId.trim().length < 4 ||
                          studentIdStatus === "checking"
                        }
                        onClick={handleVerifyStudentId}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-xs font-bold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:pointer-events-none disabled:opacity-40"
                      >
                        {studentIdStatus === "verified" ? (
                          <Icon name="check" className="size-3.5 text-emerald-600" />
                        ) : studentIdStatus === "checking" ? (
                          <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        ) : (
                          <Icon name="search" className="size-3.5" />
                        )}
                        {studentIdStatus === "checking"
                          ? "Verifying..."
                          : studentIdStatus === "verified"
                            ? "Verified"
                            : "Verify ID"}
                      </button>
                    )}
                  </div>
                  {authMode === "signup" && (
                    <span
                      className={`mt-2 flex items-center gap-1.5 text-[11px] ${
                        studentIdStatus === "verified"
                          ? "font-semibold text-emerald-600"
                          : "text-slate-500"
                      }`}
                    >
                      <Icon
                        name={studentIdStatus === "verified" ? "check" : "lock"}
                        className="size-3"
                      />
                      {studentIdStatus === "verified"
                        ? `Official database match: ${verifiedStudent?.name || fullName}${verifiedStudent?.cgpa ? ` · CGPA: ${verifiedStudent.cgpa}` : ""}`
                        : "Must be a registered student in university records (121 authorized students)."}
                    </span>
                  )}
                </div>

                {authMode === "signup" && studentIdStatus === "verified" && (
                  <div className="space-y-4 border-t border-slate-100 pt-4">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700">
                        Full name (from university records)
                      </span>
                      <input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        placeholder="Your name"
                        autoComplete="name"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700">
                        Institutional email
                      </span>
                      <input
                        type="email"
                        value={accountEmail}
                        onChange={(event) => {
                          setAccountEmail(event.target.value)
                          setOtpSent(false)
                          setOtpVerified(false)
                        }}
                        placeholder="you@university.edu"
                        autoComplete="email"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </label>
                    {accountType === "member" && (
                      <label className="block">
                        <span className="text-xs font-bold text-slate-700">
                          Team ID
                        </span>
                        <input
                          value={referralCode}
                          onChange={(event) =>
                            setReferralCode(event.target.value.toUpperCase())
                          }
                          placeholder="e.g. 0X7-8F2A"
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm tracking-wider text-slate-900 uppercase outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                        <span className="mt-2 block text-[10px] leading-4 text-slate-500">
                          Ask your team leader for their Team ID to join (Max 6 members per team).
                        </span>
                      </label>
                    )}
                    {!otpSent ? (
                      <button
                        type="button"
                        disabled={
                          !fullName.trim() ||
                          !accountEmail.trim() ||
                          (accountType === "member" && !referralCode.trim()) ||
                          isSubmitting
                        }
                        onClick={handleSendOtp}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:pointer-events-none disabled:opacity-40"
                      >
                        {isSubmitting ? (
                          <span className="inline-block size-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        ) : (
                          <Icon name="send" className="size-4" />
                        )}
                        {isSubmitting ? "Generating OTP..." : "Send email OTP"}
                      </button>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex gap-2">
                          <input
                            inputMode="numeric"
                            maxLength={6}
                            value={otpCode}
                            onChange={(event) => {
                              setOtpCode(event.target.value.replace(/\D/g, ""))
                              setOtpVerified(false)
                            }}
                            placeholder="6-digit OTP"
                            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center font-mono text-sm tracking-[0.3em] text-slate-900 outline-none placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            disabled={otpCode.length !== 6 || isSubmitting}
                            onClick={handleVerifyOtp}
                            className="rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40"
                          >
                            {isSubmitting ? (
                              <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : otpVerified ? (
                              "Verified ✓"
                            ) : (
                              "Verify OTP"
                            )}
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">
                          {otpVerified
                            ? "✓ 6-digit OTP verified against database."
                            : "Enter the 6-digit OTP sent to your email to verify authorization."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(authMode === "login" || otpVerified) && (
                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-bold text-slate-700">
                      Password
                      {authMode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            notifications.show({
                              title: "Password Reset",
                              message:
                                "Please contact research administration to reset your credentials.",
                              color: "blue",
                            })
                          }}
                          className="font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Forgot password?
                        </button>
                      )}
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={
                        authMode === "login"
                          ? "Enter your password"
                          : "At least 6 characters"
                      }
                      autoComplete={
                        authMode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                )}
                <button
                  type="submit"
                  disabled={
                    !studentId.trim() ||
                    !password.trim() ||
                    isSubmitting ||
                    (authMode === "signup" &&
                      (studentIdStatus !== "verified" ||
                        !fullName.trim() ||
                        !accountEmail.trim() ||
                        !otpVerified)) ||
                    (authMode === "signup" &&
                      accountType === "member" &&
                      !referralCode.trim())
                  }
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40"
                >
                  {isSubmitting && (
                    <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  )}
                  {authMode === "login"
                    ? isSubmitting
                      ? "Logging in..."
                      : "Log in"
                    : isSubmitting
                      ? "Creating account..."
                      : accountType === "leader"
                        ? "Create team account"
                        : "Join team"}
                  {!isSubmitting && <Icon name="arrow" className="size-4" />}
                </button>
              </form>
            )}

            {authStep === "referral" && (
              <div className="mt-7">
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/80 p-5 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Icon name="check" />
                  </span>
                  <p className="mt-4 text-xs font-bold tracking-wider text-slate-500 uppercase">
                    Your Team ID (Referral Code)
                  </p>
                  <p className="brand-code mt-2 text-2xl font-bold tracking-wider text-indigo-700">
                    {generatedCode}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard
                        ?.writeText(generatedCode)
                        .catch(() => undefined)
                      setCodeCopied(true)
                    }}
                    className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 shadow-xs"
                  >
                    {codeCopied ? "Team ID copied" : "Copy Team ID"}
                  </button>
                </div>
                <div className="mt-4 flex gap-3 rounded-xl bg-amber-50 border border-amber-200/60 p-3 text-left">
                  <Icon name="users" className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <p className="text-[11px] leading-5 text-slate-600">
                    Share this Team ID with up to 5 collaborators. They will need
                    it when creating their General Member accounts (Max 6 members total).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onEnter}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700"
                >
                  Continue to workspace
                  <Icon name="arrow" className="size-4" />
                </button>
              </div>
            )}

            {authStep !== "referral" && (
              <p className="mt-6 text-center text-xs text-slate-500">
                {authMode === "login"
                  ? "New to 0x7 Research?"
                  : "Already have an account?"}{" "}
                <button
                  onClick={() =>
                    setAuthMode(authMode === "login" ? "signup" : "login")
                  }
                  className="font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {authMode === "login" ? "Create account" : "Log in"}
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export interface ResearchTeamManagerProps {
  initialAuthenticated?: boolean
  initialView?: "landing" | "dashboard"
  onNavigateDocmost?: () => void
}

export function ResearchTeamManagerApp({
  initialAuthenticated = false,
  initialView,
}: ResearchTeamManagerProps = {}) {
  const navigate = useNavigate()
  const { data: researchNotesData } = useResearchNotesQuery()
  const { data: spacesData } = useGetSpacesQuery()
  const defaultSpace = spacesData?.items?.[0]
  const defaultSpaceId =
    defaultSpace?.id || "01a0ee80-4047-71ec-8a55-7ae9995da890"
  const defaultSpaceSlug = defaultSpace?.slug || "general"
  const createPageMutation = useCreatePageMutation()
  const togglePublishMutation = useTogglePublishMutation()
  const deletePageMutation = useDeletePageMutation()
  const removePageMutation = useRemovePageMutation()
  const restorePageMutation = useRestorePageMutation()
  const { data: deletedPagesData } = useDeletedPagesQuery(defaultSpaceId, { limit: 100 })
  const { data: currentUserData } = useCurrentUser()
  const currentUserId = currentUserData?.user?.id
  const { setColorScheme } = useMantineColorScheme()
  const computedColorScheme = useComputedColorScheme()
  const toggleTheme = () => {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark")
  }

  const [authenticated, setAuthenticated] = useState(
    initialAuthenticated || initialView === "dashboard",
  )
  const [view, setView] = useState<View>("dashboard")
  const [tab, setTab] = useState<Tab>("notes")
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("0x7_research_projects")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {
      console.error("Failed to parse projects from localStorage", e)
    }
    return initialProjects
  })
  const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
    try {
      const saved = localStorage.getItem("0x7_research_projects")
      const activeId = localStorage.getItem("0x7_active_project_id")
      if (saved) {
        const parsed: Project[] = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (activeId) {
            const match = parsed.find((p) => String(p.id) === activeId)
            if (match) return match
          }
          return parsed[0]
        }
      }
    } catch (e) {
      console.error("Failed to parse selectedProject from localStorage", e)
    }
    return null
  })

  const handleSetProjects = (newProjects: Project[]) => {
    setProjects(newProjects)
    try {
      localStorage.setItem("0x7_research_projects", JSON.stringify(newProjects))
    } catch (e) {
      console.error("Failed to save projects to localStorage", e)
    }
  }

  const [trashedProjects, setTrashedProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem("0x7_research_trashed_projects")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch (e) {
      console.error("Failed to parse trashed projects from localStorage", e)
    }
    return []
  })

  const handleSetTrashedProjects = (newTrashed: Project[]) => {
    setTrashedProjects(newTrashed)
    try {
      localStorage.setItem(
        "0x7_research_trashed_projects",
        JSON.stringify(newTrashed),
      )
    } catch (e) {
      console.error("Failed to save trashed projects to localStorage", e)
    }
  }

  const selectProject = (project: Project | null) => {
    setSelectedProject(project)
    if (project) {
      try {
        localStorage.setItem("0x7_active_project_id", String(project.id))
      } catch (e) {
        console.error("Failed to save active project id to localStorage", e)
      }
    } else {
      localStorage.removeItem("0x7_active_project_id")
    }
  }

  const [team, setTeam] = useState<Team>(() => {
    try {
      const saved = localStorage.getItem("0x7_research_team")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.id) return parsed
      }
    } catch (e) {
      console.error("Failed to parse team from localStorage", e)
    }
    return defaultInitialTeam
  })

  const handleSetTeam = (newTeam: Team) => {
    setTeam(newTeam)
    try {
      localStorage.setItem("0x7_research_team", JSON.stringify(newTeam))
    } catch (e) {
      console.error("Failed to save team to localStorage", e)
    }
  }

  const [teamMembers, setTeamMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem("0x7_research_team_members")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.error("Failed to parse team members from localStorage", e)
    }
    return members
  })

  const handleSetTeamMembers = (newMembers: Member[]) => {
    setTeamMembers(newMembers)
    try {
      localStorage.setItem(
        "0x7_research_team_members",
        JSON.stringify(newMembers),
      )
    } catch (e) {
      console.error("Failed to save team members to localStorage", e)
    }
  }

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  const currentUser: Member = useMemo(() => {
    let savedProfile: Partial<Member> | null = null
    try {
      const stored = localStorage.getItem("0x7_user_profile")
      if (stored) savedProfile = JSON.parse(stored)
    } catch (e) {
      // ignore
    }

    if (currentUserData?.user) {
      const match = teamMembers.find(
        (m) =>
          String(m.id) === String(currentUserData.user.id) ||
          m.email?.toLowerCase() === currentUserData.user.email?.toLowerCase(),
      )
      if (match) {
        return {
          ...match,
          ...(savedProfile || {}),
        }
      }
      return {
        id: currentUserData.user.id,
        name: savedProfile?.name || currentUserData.user.name || "Md Sabbir Ahmed",
        email: currentUserData.user.email || "ss@gmail.com",
        role:
          savedProfile?.role ||
          (teamMembers.length === 0 ||
          String(team.leaderId) === String(currentUserData.user.id)
            ? "Team Leader"
            : "General Member"),
        avatar: savedProfile?.avatar || (currentUserData.user as unknown as { avatar?: string })?.avatar || "",
        batch: savedProfile?.batch || "63rd Batch",
        section: savedProfile?.section || "Section C",
        studentId: savedProfile?.studentId || "0272320005101220",
        cgpa: savedProfile?.cgpa ?? 3.39,
        credits: savedProfile?.credits ?? 119.5,
        isVerified: savedProfile?.isVerified ?? true,
        bio: savedProfile?.bio || "Lead researcher exploring distributed workspace architectures and neural knowledge retrieval.",
        notes: 0,
        papers: 0,
        tasks: 0,
        share: 100,
      }
    }
    const baseMember = teamMembers[0] || defaultInitialLeader
    return {
      ...baseMember,
      ...(savedProfile || {}),
    }
  }, [currentUserData, teamMembers, team.leaderId])

  const handleSaveProfile = async (updatedData: {
    name: string
    avatar: string
    role: string
    batch: string
    section: string
    studentId: string
    cgpa?: number | string
    credits?: number | string
    isVerified?: boolean
    bio: string
  }) => {
    // 1. Update matching member in teamMembers
    let matched = false
    const updatedMembers = teamMembers.map((m) => {
      if (
        String(m.id) === String(currentUser.id) ||
        m.email?.toLowerCase() === currentUser.email?.toLowerCase()
      ) {
        matched = true
        return {
          ...m,
          ...updatedData,
        }
      }
      return m
    })

    if (!matched) {
      if (updatedMembers.length > 0) {
        updatedMembers[0] = {
          ...updatedMembers[0],
          ...updatedData,
        }
      } else {
        updatedMembers.push({
          ...currentUser,
          ...updatedData,
        })
      }
    }

    handleSetTeamMembers(updatedMembers)

    // 2. If leader, update team leaderName
    if (isLeader) {
      const updatedTeam = {
        ...team,
        leaderName: updatedData.name,
      }
      handleSetTeam(updatedTeam)
    }

    // 3. Save profile override to localStorage
    try {
      localStorage.setItem("0x7_user_profile", JSON.stringify(updatedData))
      localStorage.setItem(
        `0x7_user_profile_${currentUser.id}`,
        JSON.stringify(updatedData),
      )
    } catch (e) {
      console.error("Failed to save user profile to localStorage", e)
    }

    // 4. Sync name with backend Docmost user API
    try {
      await updateUser({ name: updatedData.name })
    } catch (e) {
      console.warn("Could not sync name to Docmost backend", e)
    }

    notifications.show({
      title: "Profile Saved",
      message: "Your profile details, photo, and academic credentials have been updated.",
      color: "green",
    })
  }

  const handleDeleteAccount = async () => {
    // 1. Remove member from team
    const remaining = teamMembers.filter(
      (m) =>
        String(m.id) !== String(currentUser.id) &&
        m.email?.toLowerCase() !== currentUser.email?.toLowerCase(),
    )
    handleSetTeamMembers(remaining.length > 0 ? remaining : [defaultInitialLeader])

    // 2. Clear all local storage records
    try {
      localStorage.removeItem("0x7_user_profile")
      localStorage.removeItem(`0x7_user_profile_${currentUser.id}`)
      localStorage.removeItem("0x7_research_team_members")
      localStorage.removeItem("0x7_research_team")
    } catch (e) {
      console.error("Failed to clean up localStorage on account deletion", e)
    }

    // 3. Call backend logout
    try {
      await api.post("/auth/logout")
    } catch (e) {
      console.warn("Backend logout failed", e)
    }

    notifications.show({
      title: "Account Deleted",
      message: "Your account and workspace membership have been removed.",
      color: "red",
    })

    // 4. Return to landing/sign-in view
    window.location.reload()
  }

  const isLeader =
    currentUser.role === "Team Leader" ||
    String(currentUser.id) === String(team.leaderId)

  const handleRemoveMember = (memberId: string | number) => {
    const memberToRemove = teamMembers.find(
      (m) => String(m.id) === String(memberId),
    )
    if (!memberToRemove) return
    if (String(memberToRemove.id) === String(team.leaderId)) {
      notifications.show({
        title: "Action not permitted",
        message: "The team leader cannot be removed from the team.",
        color: "red",
      })
      return
    }
    const updated = teamMembers.filter((m) => String(m.id) !== String(memberId))
    handleSetTeamMembers(updated)
    notifications.show({
      title: "Member Removed",
      message: `${memberToRemove.name} has been removed from the team.`,
      color: "green",
    })
  }

  const handleCopyTeamId = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(team.id).catch(() => undefined)
      }
    } catch (e) {
      console.error("Clipboard copy failed", e)
    }
    notifications.show({
      title: "Team ID Copied",
      message: `Copied "${team.id}" to clipboard. (${teamMembers.length}/6 members enrolled).`,
      color: "indigo",
    })
  }

  const handleLeaderRegistered = (leader: {
    name: string
    email: string
    teamId: string
  }) => {
    const newLeader: Member = {
      id: Date.now(),
      name: leader.name,
      email: leader.email,
      role: "Team Leader",
      avatar: "",
      notes: 0,
      papers: 0,
      tasks: 0,
      share: 100,
    }
    const newTeam: Team = {
      id: leader.teamId,
      name: `${leader.name}'s Research Unit`,
      leaderId: newLeader.id,
      leaderName: leader.name,
      createdAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    }
    handleSetTeam(newTeam)
    handleSetTeamMembers([newLeader])
  }

  const handleMemberJoined = (newMember: {
    name: string
    email: string
    teamId: string
  }) => {
    if (teamMembers.length >= 6) {
      notifications.show({
        title: "Team Full",
        message: "This team has already reached its maximum capacity of 6 members.",
        color: "red",
      })
      return
    }
    const memberObj: Member = {
      id: Date.now(),
      name: newMember.name,
      email: newMember.email,
      role: "General Member",
      avatar: "",
      notes: 0,
      papers: 0,
      tasks: 0,
      share: Math.round(100 / (teamMembers.length + 1)),
    }
    handleSetTeamMembers([...teamMembers, memberObj])
    notifications.show({
      title: "Joined Team",
      message: `Welcome to the team! Team ID: ${team.id}`,
      color: "green",
    })
  }

  const setIsSplitViewOpen = useSetAtom(isSplitViewOpenAtom)
  const setSplitPdfUrl = useSetAtom(splitPdfUrlAtom)
  const setSplitPdfName = useSetAtom(splitPdfNameAtom)
  const setSplitViewMode = useSetAtom(splitViewModeAtom)

  const [papersByProject, setPapersByProject] =
    useState<Record<number, Paper[]>>(() => {
      try {
        const saved = localStorage.getItem("0x7_research_papers_by_project")
        if (saved) return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to parse papers from localStorage", e)
      }
      return initialPapersByProject
    })
  const [phasesByProject, setPhasesByProject] = useState<
    Record<string | number, AppRoadmapPhase[]>
  >(() => {
    try {
      const saved = localStorage.getItem("0x7_research_phases_by_project")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed === "object" && parsed !== null) return parsed
      }
    } catch (e) {
      console.error("Failed to parse phases from localStorage", e)
    }
    return {}
  })

  const currentPhases = useMemo(() => {
    if (!selectedProject) return []
    return phasesByProject[selectedProject.id] || initialPhases
  }, [selectedProject, phasesByProject])

  const handleSetPhases = (
    newPhases: AppRoadmapPhase[],
  ) => {
    if (!selectedProject) return
    const updated = {
      ...phasesByProject,
      [selectedProject.id]: newPhases,
    }
    setPhasesByProject(updated)
    try {
      localStorage.setItem(
        "0x7_research_phases_by_project",
        JSON.stringify(updated),
      )
    } catch (e) {
      console.error("Failed to save phases to localStorage", e)
    }

    const overall = newPhases.length
      ? Math.round(
          newPhases.reduce((sum, p) => sum + (p.progress || 0), 0) /
            newPhases.length,
        )
      : 0

    const updatedProjects = projects.map((p) =>
      p.id === selectedProject.id ? { ...p, progress: overall } : p,
    )
    handleSetProjects(updatedProjects)
    setSelectedProject((prev) => (prev ? { ...prev, progress: overall } : null))
  }

  const handleAiPhasesUpdated = async (
    aiPhases: RoadmapPhase[],
    summary?: string,
  ) => {
    if (!selectedProject) return

    const formattedPhases: AppRoadmapPhase[] = aiPhases.map((phase, idx) => ({
      id: phase.id || idx + 1,
      title: phase.title,
      description: phase.description || "",
      date: phase.date || "TBD",
      progress: typeof phase.progress === "number" ? phase.progress : 0,
      done: !!phase.done,
      owner: (phase as any).owner || teamMembers[0] || defaultInitialLeader,
      tasks: phase.tasks || [],
    }))

    handleSetPhases(formattedPhases)

    // Sync to PostgreSQL Docmost Database as a dedicated roadmap page if not exists
    try {
      const pageTitle = `🗺️ Roadmap: ${selectedProject.title}`
      const existingRoadmapNote = dbNotes.find(
        (n) =>
          String(n.projectId) === String(selectedProject.id) &&
          n.title.toLowerCase().includes("roadmap"),
      )

      if (!existingRoadmapNote) {
        await createPageMutation.mutateAsync({
          spaceId: defaultSpaceId,
          title: pageTitle,
          isPublished: true,
          projectId: String(selectedProject.id),
        })
      }
    } catch (err) {
      console.warn("Could not sync roadmap to Docmost page DB:", err)
    }

    notifications.show({
      title: "Progression Graph Updated",
      message:
        summary ||
        `${formattedPhases.length} roadmap milestones updated in real-time.`,
      color: "teal",
      autoClose: 4000,
    })
  }

  const handleAiBoardTasksAdded = (tasks: BoardTaskItem[]) => {
    if (!tasks || tasks.length === 0) return
    const newBoardItems: BoardItem[] = tasks.map((t, idx) => ({
      id: Date.now() + idx,
      title: t.title,
      body: `Milestone action item for ${selectedProject?.title || "Research"}`,
      type: (t.type === "NOTICE" ? "notice" : "todo") as "notice" | "todo",
      created: "Just now",
      due: t.due || "Upcoming milestone",
      done: false,
      tone: (t.type === "NOTICE" ? "indigo" : "emerald") as "indigo" | "emerald",
      author: teamMembers[0] || defaultInitialLeader,
    }))
    const updated = [...boardItems, ...newBoardItems]
    handleSetBoardItems(updated)
    notifications.show({
      title: "Tasks Added to Board",
      message: `${tasks.length} new tasks created from roadmap phases.`,
      color: "teal",
      autoClose: 3500,
    })
  }
  const [boardItems, setBoardItems] = useState<BoardItem[]>(() => {
    try {
      const saved = localStorage.getItem("research_board_items")
      if (saved !== null) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            ...item,
            author: item.author || defaultInitialLeader,
          }))
        }
      }
    } catch (e) {
      console.error("Failed to parse board items from localStorage", e)
    }
    return initialBoardItems
  })

  const handleSetBoardItems = (newItems: BoardItem[]) => {
    setBoardItems(newItems)
    try {
      localStorage.setItem("research_board_items", JSON.stringify(newItems))
    } catch (e) {
      console.error("Failed to save board items to localStorage", e)
    }
  }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null)
  const [readingPaper, setReadingPaper] = useState<Paper | null>(null)
  const [addPaperOpen, setAddPaperOpen] = useState(false)
  const [paperAddTab, setPaperAddTab] = useState<"upload" | "url">("upload")
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null)
  const [uploadedPdfDataUrl, setUploadedPdfDataUrl] = useState("")
  const [paperTitle, setPaperTitle] = useState("")
  const [paperUrl, setPaperUrl] = useState("")
  const [paperAbstract, setPaperAbstract] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const pdfFileInputRef = useRef<HTMLInputElement>(null)

  // Map real database notes from PostgreSQL
  const dbNotes: Note[] = useMemo(() => {
    if (!researchNotesData?.notes) return []
    return researchNotesData.notes.map((rn) => ({
      id: rn.id,
      slugId: rn.slugId,
      spaceSlug: rn.spaceSlug || defaultSpaceSlug,
      title: rn.title,
      author: {
        id: rn.author.id === currentUserId ? currentUser.id : rn.author.id,
        name: rn.author.name || currentUser.name || "ss",
        email: "researcher@0x7.internal",
        role: String(rn.author.id) === String(team.leaderId) ? "Team Leader" : "Researcher",
        avatar: rn.author.avatar || currentUser.avatar || "",
        notes: 0,
        papers: 0,
        tasks: 0,
        share: 0,
      },
      time: new Date(rn.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      tags: ["Analysis"],
      preview: rn.preview,
      body: rn.preview,
      isPublished: rn.isPublished,
      projectId: rn.projectId,
    }))
  }, [researchNotesData, defaultSpaceSlug, currentUserId, currentUser, team.leaderId])

  const projectsWithLiveCounts = useMemo(() => {
    return projects.map((p) => {
      const matchingNotes = researchNotesData?.notes
        ? researchNotesData.notes.filter(
            (rn) => String(rn.projectId) === String(p.id),
          )
        : dbNotes.filter((rn) => String(rn.projectId) === String(p.id))
      const matchingCount = matchingNotes.length
      const matchingPublished = matchingNotes.filter((rn) => rn.isPublished).length
      const progress =
        matchingCount > 0
          ? Math.min(
              100,
              Math.round(
                ((matchingPublished * 2 + (matchingCount - matchingPublished)) /
                  Math.max(1, matchingCount * 2)) *
                  100,
              ),
            )
          : 0
      return {
        ...p,
        notes: matchingCount,
        progress,
      }
    })
  }, [projects, dbNotes, researchNotesData])

  const currentProject = useMemo(() => {
    if (!selectedProject) return null
    const found = projectsWithLiveCounts.find((p) => p.id === selectedProject.id)
    return found || selectedProject
  }, [selectedProject, projectsWithLiveCounts])

  const selectedPapers = selectedProject ? (papersByProject[selectedProject.id] ?? []) : []
  const setSelectedPapers = (updatedPapers: Paper[]) => {
    if (!selectedProject) return
    setPapersByProject((current) => {
      const next = {
        ...current,
        [selectedProject.id]: updatedPapers,
      }
      try {
        localStorage.setItem("0x7_research_papers_by_project", JSON.stringify(next))
      } catch (e) {
        console.error("Failed to save papers to localStorage", e)
      }
      return next
    })
  }

  const handleCreateNote = async () => {
    try {
      const res = await createPageMutation.mutateAsync({
        spaceId: defaultSpaceId,
        title: "Untitled Note",
        isPublished: false,
        projectId: selectedProject ? String(selectedProject.id) : undefined,
      })
      navigate(`/s/${res.space?.slug || defaultSpaceSlug}/p/${res.slugId}`)
    } catch (err) {
      console.error("Failed to create note in Docmost:", err)
    }
  }

  const handleOpenNote = (note: Note) => {
    if (note.slugId) {
      navigate(`/s/${note.spaceSlug || defaultSpaceSlug}/p/${note.slugId}`)
    } else {
      setSelectedNote(note)
    }
  }

  const handleTogglePublish = (noteId: string | number, isPublished: boolean) => {
    togglePublishMutation.mutate({
      pageId: String(noteId),
      isPublished: !isPublished,
    })
  }

  const handleDeleteNote = (noteId: string | number) => {
    modals.openConfirmModal({
      title: "Move note to Trash?",
      centered: true,
      children: (
        <Text size="sm">
          This note will be moved to Trash. You can restore it anytime from the Trash section, or permanently delete it later.
        </Text>
      ),
      labels: { confirm: "Move to Trash", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        removePageMutation.mutate(String(noteId))
      },
    })
  }

  const handleMoveToTrash = (project: Project) => {
    modals.openConfirmModal({
      title: "Move project to Trash?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to move <strong>{project.title}</strong> to Trash? You can restore it anytime from the Trash section.
        </Text>
      ),
      labels: { confirm: "Move to Trash", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        const trashedProject: Project = {
          ...project,
          deletedAt: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        }
        const updatedProjects = projects.filter((p) => p.id !== project.id)
        const updatedTrashed = [trashedProject, ...trashedProjects]

        handleSetProjects(updatedProjects)
        handleSetTrashedProjects(updatedTrashed)

        if (selectedProject?.id === project.id) {
          if (updatedProjects.length > 0) {
            selectProject(updatedProjects[0])
          } else {
            selectProject(null)
          }
          if (view === "workspace") {
            setView("dashboard")
          }
        }

        notifications.show({
          title: "Moved to Trash",
          message: `"${project.title}" has been moved to Trash.`,
          color: "red",
        })
      },
    })
  }

  const handleRestoreProject = (projectId: number) => {
    const projectToRestore = trashedProjects.find((p) => p.id === projectId)
    if (!projectToRestore) return

    const { deletedAt: _, ...restored } = projectToRestore
    const updatedTrashed = trashedProjects.filter((p) => p.id !== projectId)
    const updatedProjects = [restored, ...projects]

    handleSetProjects(updatedProjects)
    handleSetTrashedProjects(updatedTrashed)

    notifications.show({
      title: "Project Restored",
      message: `"${restored.title}" has been restored to active projects.`,
      color: "green",
    })
  }

  const handlePermanentDelete = (projectId: number) => {
    const projectToDelete = trashedProjects.find((p) => p.id === projectId)
    if (!projectToDelete) return

    modals.openConfirmModal({
      title: "Delete permanently?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to permanently delete <strong>{projectToDelete.title}</strong>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete Forever", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        const updatedTrashed = trashedProjects.filter((p) => p.id !== projectId)
        handleSetTrashedProjects(updatedTrashed)

        notifications.show({
          title: "Permanently Deleted",
          message: `"${projectToDelete.title}" was permanently removed.`,
          color: "red",
        })
      },
    })
  }

  const handleEmptyTrash = () => {
    const trashedNotesList = deletedPagesData?.items || []
    const totalTrashItems = trashedProjects.length + trashedNotesList.length
    if (totalTrashItems === 0) return

    modals.openConfirmModal({
      title: "Empty Trash?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to permanently delete all {totalTrashItems} items in Trash? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Empty Trash", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        handleSetTrashedProjects([])
        // Permanently delete all trashed notes from database
        for (const note of trashedNotesList) {
          deletePageMutation.mutate(String(note.id))
        }
        notifications.show({
          title: "Trash Emptied",
          message: "All items in Trash have been permanently deleted.",
          color: "red",
        })
      },
    })
  }

  const handleRestoreNote = (noteId: string) => {
    restorePageMutation.mutate(noteId)
  }

  const handlePermanentDeleteNote = (noteId: string) => {
    const noteToDelete = deletedPagesData?.items?.find((n) => n.id === noteId)
    modals.openConfirmModal({
      title: "Delete note permanently?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to permanently delete <strong>{noteToDelete?.title || "this note"}</strong>? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: "Delete Forever", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        deletePageMutation.mutate(noteId)
      },
    })
  }

  const trashedNotes = useMemo(() => {
    return (deletedPagesData?.items || []).map((p) => ({
      id: p.id,
      title: p.title || "Untitled Note",
      deletedAt: p.deletedAt,
      slugId: p.slugId,
    }))
  }, [deletedPagesData])

  const projectWithProgress = useMemo(
    () => {
      if (!currentProject) return null
      return {
        ...currentProject,
        papers: selectedPapers.length,
      }
    },
    [currentProject, selectedPapers.length],
  )
  const goDashboard = () => {
    setView("dashboard")
    setMobileOpen(false)
  }
  const goWorkspace = (project?: Project) => {
    const target = project || selectedProject || (projects.length > 0 ? projects[0] : null)
    if (target) {
      selectProject(target)
    }
    setView("workspace")
    setMobileOpen(false)
  }
  const handlePdfFileSelect = (file: File | null) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      notifications.show({
        title: "Invalid file",
        message: "Please choose a valid PDF file (*.pdf)",
        color: "red",
      })
      return
    }
    setUploadedPdfFile(file)
    if (!paperTitle.trim()) {
      const cleanTitle = file.name
        .replace(/\.pdf$/i, "")
        .replace(/[-_]+/g, " ")
        .trim()
      setPaperTitle(cleanTitle)
    }
    const blobUrl = URL.createObjectURL(file)
    setUploadedPdfDataUrl(blobUrl)

    if (file.size < 8 * 1024 * 1024) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setUploadedPdfDataUrl(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleReadPaperInApp = (paper: Paper) => {
    setSelectedPaper(null)
    setReadingPaper(paper)
  }

  const handleOpenPaperInSplitView = async (paper: Paper) => {
    setSelectedPaper(null)
    setReadingPaper(null)
    const pdfUrl = paper.pdfDataUrl || paper.url
    if (!pdfUrl || pdfUrl === "#") {
      notifications.show({
        title: "No PDF Available",
        message: "This paper does not have a PDF document attached.",
        color: "red",
      })
      return
    }

    setSplitPdfUrl(pdfUrl)
    setSplitPdfName(paper.title)
    setIsSplitViewOpen(true)
    setSplitViewMode("split")

    const projectNotes = selectedProject
      ? dbNotes.filter((rn) => String(rn.projectId) === String(selectedProject.id))
      : dbNotes

    if (projectNotes.length > 0) {
      const targetNote = projectNotes[0]
      navigate(`/s/${targetNote.spaceSlug || defaultSpaceSlug}/p/${targetNote.slugId}`)
    } else {
      try {
        const res = await createPageMutation.mutateAsync({
          spaceId: defaultSpaceId,
          title: `Notes: ${paper.title}`,
          isPublished: false,
          projectId: selectedProject ? String(selectedProject.id) : undefined,
        })
        navigate(`/s/${res.space?.slug || defaultSpaceSlug}/p/${res.slugId}`)
      } catch (err) {
        console.error("Failed to auto-create note for split view:", err)
      }
    }
  }

  const handleDeletePaper = (paperId: number | string) => {
    const paperToDelete = selectedPapers.find((p) => p.id === paperId)
    const paperTitle = paperToDelete?.title || "this paper"
    modals.openConfirmModal({
      title: "Delete Paper?",
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete <strong>{paperTitle}</strong>? This paper will be permanently removed from your research library.
        </Text>
      ),
      labels: { confirm: "Delete Paper", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: () => {
        const nextPapers = selectedPapers.filter((p) => p.id !== paperId)
        setSelectedPapers(nextPapers)
        if (selectedPaper?.id === paperId) {
          setSelectedPaper(null)
        }
        modals.closeAll()
        notifications.show({
          title: "Paper Deleted",
          message: `"${paperTitle}" was removed from the team library.`,
          color: "red",
        })
      },
    })
  }

  const addPaper = (event: FormEvent) => {
    event.preventDefault()
    if (!paperTitle.trim() || !selectedProject) return
    if (paperAddTab === "upload" && !uploadedPdfDataUrl && !uploadedPdfFile) {
      notifications.show({
        title: "Please choose a PDF",
        message: "Please select a PDF file to add it to the library.",
        color: "yellow",
      })
      return
    }

    const newPaper: Paper = {
      id: Date.now(),
      title: paperTitle.trim(),
      authors: `Added by ${currentUser.name}`,
      source:
        paperAddTab === "upload"
          ? (uploadedPdfFile ? `${uploadedPdfFile.name}` : "Uploaded PDF")
          : (paperUrl.trim() || "External Source"),
      url: uploadedPdfDataUrl || paperUrl.trim() || "#",
      saved: true,
      year: new Date().getFullYear(),
      added: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      abstract:
        paperAbstract.trim() ||
        (paperAddTab === "upload"
          ? "Uploaded research PDF paper ready for in-app reading and split-screen note taking."
          : "Research paper linked from external source."),
      pdfDataUrl: uploadedPdfDataUrl || (paperUrl?.toLowerCase().endsWith(".pdf") ? paperUrl : undefined),
      fileSize: uploadedPdfFile ? formatFileSize(uploadedPdfFile.size) : undefined,
    }

    setSelectedPapers([...selectedPapers, newPaper])
    setPaperTitle("")
    setPaperUrl("")
    setPaperAbstract("")
    setUploadedPdfFile(null)
    setUploadedPdfDataUrl("")
    setAddPaperOpen(false)

    notifications.show({
      title: "Paper Added",
      message: `"${newPaper.title}" was added to the team library.`,
      color: "green",
    })
  }

  const handleSignOut = () => {
    localStorage.removeItem("0x7_user_profile")
    localStorage.removeItem("0x7_research_auth_user")
    setAuthenticated(false)
    navigate("/")
  }

  if (!authenticated) {
    return (
      <ResearchLandingPage
        onEnter={() => setAuthenticated(true)}
        onLeaderRegistered={handleLeaderRegistered}
        onMemberJoined={handleMemberJoined}
      />
    )
  }
  return (
    <div className="app-shell min-h-screen font-sans text-slate-900">
      <Sidebar
        view={view}
        projects={projectsWithLiveCounts}
        selectedProjectId={currentProject?.id}
        onNew={() => setCreateOpen(true)}
        onDashboard={goDashboard}
        onTrash={() => {
          setView("trash")
          setMobileOpen(false)
        }}
        trashCount={trashedProjects.length + trashedNotes.length}
        onProject={goWorkspace}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        currentUser={currentUser}
        team={team}
        members={teamMembers}
        onCopyTeamId={handleCopyTeamId}
        colorScheme={computedColorScheme}
        onToggleTheme={toggleTheme}
        onOpenAccountSettings={() => setIsAccountModalOpen(true)}
        onSignOut={handleSignOut}
      />
      <div className="min-h-screen lg:pl-64">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          currentUser={currentUser}
          team={team}
          membersCount={teamMembers.length}
          onCopyTeamId={handleCopyTeamId}
          colorScheme={computedColorScheme}
          onToggleTheme={toggleTheme}
          onOpenAccountSettings={() => setIsAccountModalOpen(true)}
        />
        {view === "dashboard" && (
          <Dashboard
            projects={projectsWithLiveCounts}
            boardItems={boardItems}
            setBoardItems={handleSetBoardItems}
            totalNotesCount={researchNotesData?.totalNotes ?? 0}
            yourNotesCount={researchNotesData?.yourNotesCount ?? 0}
            publishedNotesCount={researchNotesData?.publishedNotesCount ?? 0}
            currentUser={currentUser}
            team={team}
            members={teamMembers}
            onCopyTeamId={handleCopyTeamId}
            onNew={() => setCreateOpen(true)}
            onOpen={(project) => {
              selectProject(project)
              setView("workspace")
            }}
            onMoveToTrash={handleMoveToTrash}
            colorScheme={computedColorScheme}
            onToggleTheme={toggleTheme}
            onOpenAccountSettings={() => setIsAccountModalOpen(true)}
          />
        )}
        {view === "progress" && (
          projectWithProgress ? (
            <ProgressView
              project={projectWithProgress}
              totalNotes={researchNotesData?.totalNotes ?? 0}
              publishedNotes={researchNotesData?.publishedNotesCount ?? 0}
              onBack={goDashboard}
              onWorkspace={() => goWorkspace()}
            />
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                <Icon name="chart" className="size-8" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-slate-900">No project roadmap</h2>
              <p className="mt-2 text-sm text-slate-500">
                Please create a research project first to view its roadmap and velocity progress.
              </p>
              <Button className="mt-6" onClick={() => setCreateOpen(true)}>
                <Icon name="plus" className="size-4" />
                Create First Project
              </Button>
            </div>
          )
        )}
        {view === "workspace" && (
          projectWithProgress ? (
            <Workspace
              project={projectWithProgress}
              tab={tab}
              setTab={setTab}
              notes={dbNotes.filter(
                (n) =>
                  currentProject &&
                  String(n.projectId) === String(currentProject.id),
              )}
              onCreateNote={handleCreateNote}
              onTogglePublish={handleTogglePublish}
              onDeleteNote={handleDeleteNote}
              onMoveToTrash={handleMoveToTrash}
              yourNotesCount={researchNotesData?.yourNotesCount ?? 0}
              publishedNotesCount={researchNotesData?.publishedNotesCount ?? 0}
              papers={selectedPapers}
              setPapers={setSelectedPapers}
              phases={currentPhases}
              setPhases={handleSetPhases}
              onPhasesUpdated={handleAiPhasesUpdated}
              onBoardTasksAdded={handleAiBoardTasksAdded}
              members={teamMembers}
              team={team}
              isLeader={isLeader}
              currentUserId={currentUser.id}
              onRemoveMember={handleRemoveMember}
              onCopyTeamId={handleCopyTeamId}
              onBack={goDashboard}
              openNote={handleOpenNote}
              previewPaper={setSelectedPaper}
              addPaper={() => setAddPaperOpen(true)}
              onOpenSplitView={handleOpenPaperInSplitView}
              onDeletePaper={handleDeletePaper}
              onOpenAccountSettings={() => setIsAccountModalOpen(true)}
            />
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                <Icon name="folder" className="size-8" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-slate-900">No project selected</h2>
              <p className="mt-2 text-sm text-slate-500">
                Create a research project to start writing notes, organizing papers, and tracking milestones.
              </p>
              <Button className="mt-6" onClick={() => setCreateOpen(true)}>
                <Icon name="plus" className="size-4" />
                Create First Project
              </Button>
            </div>
          )
        )}
        {view === "trash" && (
          <TrashView
            trashedProjects={trashedProjects}
            trashedNotes={trashedNotes}
            onRestore={handleRestoreProject}
            onPermanentDelete={handlePermanentDelete}
            onRestoreNote={handleRestoreNote}
            onPermanentDeleteNote={handlePermanentDeleteNote}
            onEmptyTrash={handleEmptyTrash}
            onBack={goDashboard}
          />
        )}
      </div>
      {createOpen && (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreate={(project) => {
            const next = [project, ...projects]
            handleSetProjects(next)
            selectProject(project)
            setCreateOpen(false)
          }}
        />
      )}
      {selectedNote && (
        <Modal
          title={selectedNote.title}
          description={`Published by ${selectedNote.author.name} · ${selectedNote.time}`}
          onClose={() => setSelectedNote(null)}
          wide
        >
          <div className="p-6">
            <div className="flex flex-wrap gap-2">
              {selectedNote.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
            <p className="mt-6 text-base leading-8 text-slate-700">
              {selectedNote.body}
            </p>
            {selectedNote.paper && (
              <div className="mt-8 rounded-xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Linked paper
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-indigo-700">
                  <Icon name="link" className="size-4" />
                  {selectedNote.paper}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
      {selectedPaper && (
        <Modal
          title="Paper preview"
          description="Library metadata and abstract"
          onClose={() => setSelectedPaper(null)}
          wide
        >
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
                <Icon name="paper" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#f0fdf4]">
                  {selectedPaper.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-emerald-100/60">
                  {selectedPaper.authors} · {selectedPaper.year}
                  {selectedPaper.fileSize && ` · ${selectedPaper.fileSize}`}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-emerald-100/40">
                Abstract
              </h4>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {selectedPaper.abstract}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-[#0a1410] border border-slate-200 dark:border-[#1c3327] p-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <Icon name="link" className="size-4 shrink-0" />
                <span className="truncate">{selectedPaper.source}</span>
              </div>
              {selectedPaper.pdfDataUrl && (
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
                  PDF Available
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-100 dark:border-[#1c3327] pt-4">
              <button
                type="button"
                onClick={() => handleDeletePaper(selectedPaper.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer"
                title="Delete paper from library"
              >
                <Icon name="trash" className="size-4" />
                <span>Delete Paper</span>
              </button>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setSelectedPaper(null)}>
                  Close
                </Button>
                {selectedPaper.url && selectedPaper.url !== "#" && (
                  <a
                    href={selectedPaper.url}
                    download={selectedPaper.title}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#16291e] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1f372c] transition"
                  >
                    <Icon name="download" className="size-4" />
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenPaperInSplitView(selectedPaper)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition active:scale-95 cursor-pointer"
                >
                  <Icon name="notes" className="size-4" />
                  Split View with Notes
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {addPaperOpen && (
        <Modal
          title="Add a paper"
          description="Upload a PDF or add from a URL to the team library."
          onClose={() => {
            setAddPaperOpen(false)
            setPaperAddTab("upload")
            setUploadedPdfFile(null)
            setUploadedPdfDataUrl("")
            setPaperTitle("")
            setPaperUrl("")
            setPaperAbstract("")
          }}
          wide
        >
          <form onSubmit={addPaper} className="space-y-5 p-6">
            <input
              ref={pdfFileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handlePdfFileSelect(e.target.files?.[0] || null)}
            />

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-[#0a1410] p-1 border border-transparent dark:border-[#1c3327]">
              <button
                type="button"
                onClick={() => setPaperAddTab("upload")}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  paperAddTab === "upload"
                    ? "bg-white dark:bg-[#16291e] text-slate-900 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon name="paper" className="size-3.5" />
                Upload PDF
              </button>
              <button
                type="button"
                onClick={() => setPaperAddTab("url")}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  paperAddTab === "url"
                    ? "bg-white dark:bg-[#16291e] text-slate-900 dark:text-emerald-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon name="link" className="size-3.5" />
                Add URL
              </button>
            </div>

            {paperAddTab === "upload" && (
              <div>
                {!uploadedPdfFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOver(true)
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOver(false)
                      handlePdfFileSelect(e.dataTransfer.files?.[0] || null)
                    }}
                    onClick={() => pdfFileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center cursor-pointer transition ${
                      isDragOver
                        ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30"
                        : "border-slate-200 dark:border-[#1c3327] hover:border-emerald-500/60 dark:hover:border-emerald-500/60 bg-slate-50/50 dark:bg-[#0d1713]"
                    }`}
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 mb-3">
                      <Icon name="paper" className="size-6" />
                    </span>
                    <p className="text-sm font-bold text-slate-800 dark:text-[#f0fdf4]">
                      Click to select or drag and drop a PDF
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Research paper, survey, or thesis PDF (up to 50MB)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 dark:border-emerald-800/60 dark:bg-[#0e2118]">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500">
                        <Icon name="paper" className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-[#f0fdf4]">
                          {uploadedPdfFile.name}
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatFileSize(uploadedPdfFile.size)} · Ready to read in-app
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPdfFile(null)
                        setUploadedPdfDataUrl("")
                        if (pdfFileInputRef.current) pdfFileInputRef.current.value = ""
                      }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/50 dark:hover:bg-[#162820] hover:text-rose-500 transition cursor-pointer"
                      title="Remove file"
                    >
                      <Icon name="close" className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Paper title
              </span>
              <input
                value={paperTitle}
                onChange={(event) => setPaperTitle(event.target.value)}
                placeholder="Enter paper title"
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#0d1713] px-4 py-3 text-sm text-slate-900 dark:text-[#f0fdf4] outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20"
              />
            </label>

            {paperAddTab === "url" && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Source URL
                </span>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#0d1713] px-4 py-3 text-slate-400 focus-within:border-emerald-500 focus-within:ring-3 focus-within:ring-emerald-500/20">
                  <Icon name="link" className="size-4 shrink-0" />
                  <input
                    value={paperUrl}
                    onChange={(event) => setPaperUrl(event.target.value)}
                    placeholder="https://arxiv.org/pdf/..."
                    className="min-w-0 flex-1 text-sm text-slate-900 dark:text-[#f0fdf4] bg-transparent outline-none"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Abstract or Notes (optional)
              </span>
              <textarea
                value={paperAbstract}
                onChange={(event) => setPaperAbstract(event.target.value)}
                placeholder="Brief summary, methodology, or reading goals..."
                rows={3}
                className="mt-2 w-full rounded-xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#0d1713] px-4 py-3 text-sm text-slate-900 dark:text-[#f0fdf4] outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/20 resize-none"
              />
            </label>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-[#1c3327] pt-5">
              <Button
                variant="secondary"
                onClick={() => {
                  setAddPaperOpen(false)
                  setUploadedPdfFile(null)
                  setUploadedPdfDataUrl("")
                  setPaperTitle("")
                  setPaperUrl("")
                  setPaperAbstract("")
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !paperTitle.trim() ||
                  (paperAddTab === "upload" && !uploadedPdfFile && !uploadedPdfDataUrl)
                }
              >
                <Icon name="plus" className="size-4" />
                Add to library
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {readingPaper && (
        <InAppPdfReaderModal
          paper={readingPaper}
          onClose={() => setReadingPaper(null)}
          onSplitView={handleOpenPaperInSplitView}
        />
      )}

      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onSaveProfile={handleSaveProfile}
        onDeleteAccount={handleDeleteAccount}
        colorScheme={computedColorScheme}
      />
    </div>
  )
}

export default ResearchTeamManagerApp

