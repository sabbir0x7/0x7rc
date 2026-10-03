import React, { useState } from "react";
import { NoticeItem } from "../../types";

interface NoticeBoardProps {
  notices: NoticeItem[];
  onAddNotice: (title: string, content: string, type: "notice" | "todo", dueDate?: string) => void;
  onToggleNotice: (id: string) => void;
  onDeleteNotice: (id: string) => void;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({
  notices,
  onAddNotice,
  onToggleNotice,
  onDeleteNotice,
}) => {
  const [filter, setFilter] = useState<"all" | "notice" | "todo">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"notice" | "todo">("notice");
  const [dueDate, setDueDate] = useState("");

  const filteredNotices = notices.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddNotice(title.trim(), content.trim(), type, dueDate || undefined);
    setTitle("");
    setContent("");
    setDueDate("");
    setIsAdding(false);
  };

  return (
    <div className="rc-glass-panel p-5 flex flex-col h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-300/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <h2 className="text-base font-bold text-[#0F172A]">Team Notice Board</h2>
          <span className="rc-mono text-xs px-2 py-0.5 rounded-full bg-white/70 border border-slate-300/50 text-slate-600 font-semibold">
            {notices.length}
          </span>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="rc-btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Post Note</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 pt-3 pb-2 text-xs">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-lg font-medium transition-all ${
            filter === "all"
              ? "bg-white text-[#0F172A] shadow-sm font-semibold border border-slate-300/40"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          All ({notices.length})
        </button>
        <button
          onClick={() => setFilter("notice")}
          className={`px-3 py-1 rounded-lg font-medium transition-all ${
            filter === "notice"
              ? "bg-white text-[#0F172A] shadow-sm font-semibold border border-slate-300/40"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Notices ({notices.filter((n) => n.type === "notice").length})
        </button>
        <button
          onClick={() => setFilter("todo")}
          className={`px-3 py-1 rounded-lg font-medium transition-all ${
            filter === "todo"
              ? "bg-white text-[#0F172A] shadow-sm font-semibold border border-slate-300/40"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          To-Dos ({notices.filter((n) => n.type === "todo").length})
        </button>
      </div>

      {/* Inline Creation Card */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="my-3 p-4 rounded-xl bg-white/90 border border-slate-300 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setType("notice")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                type === "notice"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Notice
            </button>
            <button
              type="button"
              onClick={() => setType("todo")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                type === "todo"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Team Task (To-Do)
            </button>
          </div>

          <input
            type="text"
            required
            placeholder={type === "notice" ? "Notice title..." : "Task title..."}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rc-glass-input w-full px-3 py-2 text-sm"
          />

          <textarea
            rows={2}
            placeholder="Details or link to document..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="rc-glass-input w-full px-3 py-2 text-xs resize-none"
          />

          <div className="flex items-center justify-between pt-1">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rc-glass-input px-2.5 py-1 text-xs text-slate-600"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rc-btn-primary px-3.5 py-1 rounded-lg text-xs font-semibold"
              >
                Publish
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notice Items List */}
      <div className="flex-1 overflow-y-auto rc-custom-scrollbar space-y-3 mt-2 pr-1 min-h-[220px]">
        {filteredNotices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-300/60 rounded-xl my-auto">
            <div className="w-10 h-10 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-[#0F172A] mb-1">
              Notice Board is Clear
            </h4>
            <p className="text-xs text-[#475569] max-w-xs">
              No active notices or team tasks yet. Use the &apos;Post Note&apos; button above to announce a meeting or assign a task.
            </p>
          </div>
        ) : (
          filteredNotices.map((item) => (
            <div
              key={item.id}
              className={`rc-glass-card p-4 flex items-start justify-between gap-3 ${
                item.isCompleted ? "opacity-60 bg-white/40" : "bg-white/70"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {item.type === "todo" && (
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={() => onToggleNotice(item.id)}
                    className="mt-1 w-4 h-4 rounded text-slate-800 border-slate-300 focus:ring-0 cursor-pointer"
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.type === "todo"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-slate-200 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {item.type}
                    </span>
                    <h4
                      className={`text-sm font-bold text-[#0F172A] truncate ${
                        item.isCompleted ? "line-through text-slate-500" : ""
                      }`}
                    >
                      {item.title}
                    </h4>
                  </div>

                  {item.content && (
                    <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed mb-2">
                      {item.content}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>By {item.authorName}</span>
                    {item.dueDate && (
                      <span className="rc-mono text-slate-600 font-medium">
                        Due: {item.dueDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteNotice(item.id)}
                title="Remove note"
                className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
