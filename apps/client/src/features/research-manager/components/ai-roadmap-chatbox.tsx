import { useState, useEffect, useRef, FormEvent } from "react"
import {
  IconSparkles,
  IconSend,
  IconKey,
  IconTrash,
  IconCheck,
  IconLoader2,
  IconTimeline,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react"
import {
  ChatMessage,
  RoadmapPhase,
  BoardTaskItem,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  sendRoadmapChatToGemini,
} from "../services/gemini-roadmap-service"

interface AiRoadmapChatboxProps {
  projectId: number | string
  projectTitle: string
  currentPhases: RoadmapPhase[]
  onPhasesUpdated: (phases: RoadmapPhase[], summary?: string) => void
  onBoardTasksAdded?: (tasks: BoardTaskItem[]) => void
  className?: string
}

export function AiRoadmapChatbox({
  projectId,
  projectTitle,
  currentPhases,
  onPhasesUpdated,
  onBoardTasksAdded,
  className = "",
}: AiRoadmapChatboxProps) {
  const [apiKey, setApiKey] = useState(getStoredGeminiApiKey())
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [tempKey, setTempKey] = useState(apiKey)
  const [isKeySaved, setIsKeySaved] = useState(false)

  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const storageKey = `0x7_research_chat_${projectId}`
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      // ignore
    }
    return [
      {
        id: "initial-welcome",
        role: "assistant",
        text: `Hello! I'm your Gemini AI Research Roadmap Architect. Paste your research plan, thesis syllabus, or milestone notes below, or give me commands (e.g. "Create a 4-phase roadmap for ${projectTitle}"). I'll structure your milestones and update the progression graph in real-time.`,
        timestamp: "Just now",
      },
    ]
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch (e) {
      // ignore
    }
  }, [messages, storageKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  const handleSaveKey = () => {
    const trimmed = tempKey.trim()
    setApiKey(trimmed)
    setStoredGeminiApiKey(trimmed)
    setIsKeySaved(true)
    setTimeout(() => {
      setIsKeySaved(false)
      setShowKeyInput(false)
    }, 1200)
  }

  const handleSendMessage = async (textToSend?: string) => {
    const msgText = (textToSend || input).trim()
    if (!msgText || isLoading) return

    setError(null)
    setInput("")

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      role: "user",
      text: msgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setIsLoading(true)

    try {
      const response = await sendRoadmapChatToGemini({
        history: nextMessages,
        userMessage: msgText,
        currentPhases,
        apiKey: apiKey || undefined,
      })

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: "assistant",
        text: response.reply || "Roadmap and progression graph updated successfully!",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        phases: response.phases,
        summary: response.summary,
      }

      setMessages((prev) => [...prev, assistantMsg])

      // Real-time sync: update phases and progression graph
      if (response.phases && response.phases.length > 0) {
        onPhasesUpdated(response.phases, response.summary)
      }

      // Add tasks to board if returned
      if (response.tasks && response.tasks.length > 0 && onBoardTasksAdded) {
        onBoardTasksAdded(response.tasks)
      }
    } catch (err: any) {
      setError(err?.message || "Failed to communicate with Gemini API.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearHistory = () => {
    const reset = [
      {
        id: "initial-welcome",
        role: "assistant" as const,
        text: `Chat reset. Give me instructions or paste your plan for ${projectTitle} to regenerate the roadmap.`,
        timestamp: "Just now",
      },
    ]
    setMessages(reset)
    try {
      localStorage.setItem(storageKey, JSON.stringify(reset))
    } catch (e) {
      // ignore
    }
  }

  const samplePrompts = [
    `Create a 4-phase roadmap for ${projectTitle}`,
    "Add 2 weeks buffer to all milestone deadlines",
    "Mark Phase 1 as 100% done and advance Phase 2 to 40%",
    "Add PyTorch model evaluation & benchmark tasks",
  ]

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] shadow-sm overflow-hidden ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1c3327] px-4 py-3 bg-slate-50/70 dark:bg-[#0d1713]">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
            <IconSparkles size={16} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#f0fdf4] flex items-center gap-1.5">
              Gemini AI Roadmap Assistant
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                Real-time Sync
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-emerald-100/50">
              Conversational roadmap generation & graph controller
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowKeyInput((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
              apiKey
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
            title="Configure Gemini API Key"
          >
            <IconKey size={13} />
            <span>{apiKey ? "API Key Active" : "Set API Key"}</span>
            {showKeyInput ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-[#16291e] transition cursor-pointer"
            title="Clear chat history"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      {/* Collapsible API Key Configuration */}
      {showKeyInput && (
        <div className="border-b border-slate-100 dark:border-[#1c3327] bg-slate-100/60 dark:bg-[#0a1410] p-3 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-600 dark:text-emerald-100/70">
            <span className="font-semibold">Gemini API Key:</span>
            <span className="text-[10px] text-slate-400">Loaded from .env or override below</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder="Paste Gemini API Key (AIzaSy...)"
              className="flex-1 rounded-xl border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] px-3 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 font-bold text-white transition cursor-pointer"
            >
              {isKeySaved ? <IconCheck size={14} /> : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Chat Messages Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[380px] text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === "user"
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs"
                    : "bg-slate-100 dark:bg-[#162820] text-slate-800 dark:text-[#f0fdf4] border border-slate-200/60 dark:border-[#1c3327] rounded-bl-xs"
                }`}
              >
                <p>{msg.text}</p>

                {/* Formatted Roadmap Card if generated */}
                {!isUser && msg.phases && msg.phases.length > 0 && (
                  <div className="mt-2.5 rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
                      <span className="flex items-center gap-1">
                        <IconTimeline size={13} />
                        {msg.phases.length} Phases Synchronized
                      </span>
                      <span>Real-time</span>
                    </div>
                    <div className="space-y-1">
                      {msg.phases.slice(0, 4).map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center justify-between text-[10px] text-slate-300 bg-[#0d1713]/80 px-2 py-1 rounded"
                        >
                          <span className="truncate max-w-[200px]">
                            {idx + 1}. {p.title}
                          </span>
                          <span className="font-mono text-emerald-400 shrink-0">
                            {p.date || `${p.progress}%`}
                          </span>
                        </div>
                      ))}
                      {msg.phases.length > 4 && (
                        <p className="text-[10px] text-emerald-300 text-center">
                          +{msg.phases.length - 4} more phases updated in graph
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 text-[9px] text-slate-400 dark:text-emerald-100/40">
                {msg.timestamp}
              </span>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 dark:bg-[#162820] border border-emerald-500/20 px-3 py-2 rounded-xl w-fit animate-pulse">
            <IconLoader2 size={15} className="animate-spin" />
            <span>Gemini AI is analyzing plan & updating progression graph...</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-500">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-t border-slate-100 dark:border-[#1c3327] bg-slate-50/50 dark:bg-[#0d1713]/50 no-scrollbar">
        <span className="text-[10px] text-slate-400 font-semibold shrink-0">Try:</span>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            type="button"
            disabled={isLoading}
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 rounded-lg border border-slate-200 dark:border-[#1c3327] bg-white dark:bg-[#111f18] px-2 py-1 text-[10px] font-medium text-slate-600 dark:text-emerald-300/80 hover:bg-slate-100 dark:hover:bg-[#16291e] transition cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          handleSendMessage()
        }}
        className="flex items-end gap-2 border-t border-slate-100 dark:border-[#1c3327] p-3 bg-white dark:bg-[#111f18]"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          rows={2}
          placeholder="Give AI instructions or paste roadmap text... (Enter to send)"
          className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-[#1c3327] bg-slate-50 dark:bg-[#0a1410] px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500 placeholder:text-slate-400 dark:placeholder:text-emerald-100/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 font-bold text-white shadow-sm transition active:scale-95 cursor-pointer"
          title="Send instruction to Gemini"
        >
          {isLoading ? (
            <IconLoader2 size={16} className="animate-spin" />
          ) : (
            <IconSend size={16} />
          )}
        </button>
      </form>
    </div>
  )
}
