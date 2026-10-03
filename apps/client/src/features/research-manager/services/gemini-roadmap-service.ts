export interface PhaseTask {
  id: number
  title: string
  done: boolean
}

export interface RoadmapPhase {
  id: number
  title: string
  description: string
  date: string
  progress: number
  done: boolean
  tasks?: PhaseTask[]
}

export interface BoardTaskItem {
  title: string
  type: "TO-DO" | "NOTICE" | "MILESTONE"
  due?: string
}

export interface RoadmapChatResponse {
  reply: string
  phases?: RoadmapPhase[]
  tasks?: BoardTaskItem[]
  summary?: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  timestamp: string
  phases?: RoadmapPhase[]
  summary?: string
}

export function getStoredGeminiApiKey(): string {
  try {
    const local = localStorage.getItem("0x7_gemini_api_key")
    if (local && local.trim()) return local.trim()
  } catch (e) {
    // ignore
  }

  // Vite defined env variables
  const envKey =
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    (typeof process !== "undefined" && process.env?.VITE_GEMINI_API_KEY) ||
    (import.meta.env?.VITE_GEMINI_API_KEY as string) ||
    ""

  return (envKey || "").trim()
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    localStorage.setItem("0x7_gemini_api_key", key.trim())
  } catch (e) {
    // ignore
  }
}

function parseRoadmapLocally(userMessage: string, currentPhases: RoadmapPhase[] = []): RoadmapChatResponse {
  const text = userMessage.toLowerCase()

  // Case A: User pastes phases text with numbers / "phase" / percentages
  const phaseMatches = Array.from(
    userMessage.matchAll(/(?:phase\s*(\d+)[:\.\s\-]+|(\d+)[\.\)]\s+)([^.\n;]+)(?:[.\n;]|$)/gi)
  )

  if (phaseMatches.length >= 2) {
    const newPhases: RoadmapPhase[] = phaseMatches.map((m, idx) => {
      const content = (m[3] || "").trim()
      let progress = 0
      let done = false
      const pctMatch = content.match(/(\d{1,3})%/)
      if (pctMatch) {
        progress = Math.min(100, Math.max(0, parseInt(pctMatch[1], 10)))
        done = progress === 100
      } else if (content.toLowerCase().includes("done") || content.toLowerCase().includes("complete")) {
        progress = 100
        done = true
      } else if (content.toLowerCase().includes("progress")) {
        progress = 40
      }

      const cleanTitle = content
        .replace(/\(?\d{1,3}%[^)]*\)?/g, "")
        .replace(/\(?(complete|done|in progress|upcoming|starting)\)?/gi, "")
        .replace(/[:\-–—]+$/, "")
        .trim() || `Phase ${idx + 1}`

      return {
        id: idx + 1,
        title: cleanTitle,
        description: `Research milestone focused on ${cleanTitle.toLowerCase()}.`,
        date: `Milestone ${idx + 1}`,
        progress,
        done,
        tasks: [
          { id: (idx + 1) * 10 + 1, title: `Core deliverable for ${cleanTitle}`, done },
          { id: (idx + 1) * 10 + 2, title: `Verification & benchmarks`, done: progress > 50 },
        ],
      }
    })

    return {
      reply: `Successfully parsed your roadmap and updated all ${newPhases.length} research phases in real-time!\n\n*(Note: Add your GEMINI_API_KEY in .env or click "Set API Key" above to enable live Google Gemini generative intelligence).*`,
      phases: newPhases,
      tasks: newPhases.map((p) => ({
        title: `Execute ${p.title}`,
        type: "TO-DO" as const,
        due: p.date,
      })),
      summary: `Synchronized ${newPhases.length} research milestones to progression graph`,
    }
  }

  // Case B: Toggle or mark complete
  if (text.includes("mark") || text.includes("complete") || text.includes("done")) {
    const updated = currentPhases.map((p, idx) => {
      if (text.includes(`phase ${idx + 1}`) || text.includes(p.title.toLowerCase())) {
        return { ...p, done: true, progress: 100 }
      }
      return p
    })
    return {
      reply: "Milestone marked as complete! Progression dial and statistics updated.",
      phases: updated,
      summary: "Updated milestone status",
    }
  }

  // Case C: Standard generation fallback
  const defaultTemplates = [
    { title: "Problem Definition & Threat Models", progress: 100, done: true },
    { title: "Literature Analysis & SOTA LLM Benchmarks", progress: 100, done: true },
    { title: "Jailbreak & Prompt Injection Defense Framework", progress: 75, done: false },
    { title: "Automated Red-Teaming Engine", progress: 40, done: false },
    { title: "Empirical Security Evaluation & Paper Writing", progress: 0, done: false },
  ]
  const generatedPhases: RoadmapPhase[] = defaultTemplates.map((t, idx) => ({
    id: idx + 1,
    title: t.title,
    description: `Structured milestone for research deliverables.`,
    date: `Target M${idx + 1}`,
    progress: t.progress,
    done: t.done,
    tasks: [
      { id: (idx + 1) * 10 + 1, title: `Primary task for ${t.title}`, done: t.done },
      { id: (idx + 1) * 10 + 2, title: `Evaluation and team review`, done: t.done },
    ],
  }))

  return {
    reply: `Generated a comprehensive research roadmap tailored to your project goals.\n\n*(Tip: Provide your GEMINI_API_KEY in .env or in the key drawer above for deep Google Gemini reasoning).*`,
    phases: generatedPhases,
    tasks: [
      { title: "Review new roadmap milestones", type: "TO-DO", due: "Next week" },
    ],
    summary: "Created 5-phase research roadmap",
  }
}

export async function sendRoadmapChatToGemini({
  history,
  userMessage,
  currentPhases = [],
  apiKey,
}: {
  history: ChatMessage[]
  userMessage: string
  currentPhases?: RoadmapPhase[]
  apiKey?: string
}): Promise<RoadmapChatResponse> {
  const activeKey = (apiKey || getStoredGeminiApiKey()).trim()
  if (!activeKey) {
    return parseRoadmapLocally(userMessage, currentPhases)
  }

  const systemInstruction = `You are an expert Research Director and Academic Agile Architect.
The user is working on a collaborative research project in Docmost Research Center.
Your goal is to parse raw text (syllabi, thesis outlines, research plans, or conversational commands like "add benchmark task to phase 2", "make phase 1 100% complete", "extend deadline") and convert them into structured roadmap phases and progression graph data.

Current Project Phases:
${JSON.stringify(currentPhases, null, 2)}

Instructions:
1. Always maintain realistic research milestones (e.g. Literature Review, Dataset / Methodology, Experiments & Benchmarks, Analysis, Paper Writing & Submission).
2. For each phase, assign a logical timeframe (e.g. "Oct 12 – Nov 20"), progress (0-100), done (boolean), and 2-4 concrete actionable subtasks.
3. If the user asks to modify an existing phase (e.g. "mark done", "add task", "shift dates"), update the existing phases rather than deleting them, unless the user asked for a completely new roadmap.
4. Return a response strictly formatted as valid JSON adhering to the following schema:
{
  "reply": "Your friendly, concise explanation to the user of what was created or changed (can be in English or Bengali depending on user query)",
  "phases": [
    {
      "id": 1,
      "title": "Phase title",
      "description": "Short 1-2 sentence description",
      "date": "Month Day – Month Day",
      "progress": 0 to 100,
      "done": false,
      "tasks": [
        { "id": 1, "title": "Specific deliverable / task", "done": false }
      ]
    }
  ],
  "tasks": [
    { "title": "Key project board task", "type": "TO-DO", "due": "Due date" }
  ],
  "summary": "Quick one-line status summary"
}`

  const contents = [
    {
      role: "user",
      parts: [{ text: systemInstruction }],
    },
    {
      role: "model",
      parts: [
        {
          text: JSON.stringify({
            reply: "Understood. I will parse any research text or instructions and return structured phases with tasks and progression graph data in clean JSON.",
            phases: currentPhases,
          }),
        },
      ],
    },
  ]

  // Add conversation turns
  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    })
  }

  // Add current message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  })

  // Try gemini-1.5-flash first, fallback to gemini-2.0-flash
  const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
  let lastError = ""

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      activeKey,
    )}`

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      })

      if (!resp.ok) {
        const errText = await resp.text()
        lastError = `Model ${model} error (${resp.status}): ${errText}`
        continue
      }

      const data = await resp.json()
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) {
        lastError = `No response candidate returned from ${model}`
        continue
      }

      const parsed: RoadmapChatResponse = JSON.parse(rawText)
      // Normalize phase IDs if needed
      if (Array.isArray(parsed.phases)) {
        parsed.phases = parsed.phases.map((p, idx) => ({
          ...p,
          id: p.id || idx + 1,
          tasks: (p.tasks || []).map((t, tIdx) => ({
            ...t,
            id: t.id || tIdx + 1,
          })),
        }))
      }

      return parsed
    } catch (e: any) {
      lastError = e?.message || String(e)
    }
  }

  console.warn("Gemini API call failed, falling back to local semantic parser:", lastError)
  const localRes = parseRoadmapLocally(userMessage, currentPhases)
  localRes.reply = `⚠️ Gemini API Notice: ${lastError || "Network issue"}\n\n${localRes.reply}`
  return localRes
}
