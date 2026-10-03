import React from "react";
import { Note } from "../../../types";

interface YourNotesTabProps {
  notes: Note[];
  currentUserId: string;
  onOpenCreateNote: () => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
}

export const YourNotesTab: React.FC<YourNotesTabProps> = ({
  notes,
  currentUserId,
  onOpenCreateNote,
  onEditNote,
  onDeleteNote,
}) => {
  // Filter for notes authored by current user
  const userNotes = notes.filter((n) => n.authorId === currentUserId || !n.authorId);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Your Private Notes</h3>
          <p className="text-xs text-[#475569]">
            Confidential research drafts and ideas. Visible only to you until explicitly published.
          </p>
        </div>

        <button
          onClick={onOpenCreateNote}
          className="rc-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Compose Note</span>
        </button>
      </div>

      {/* Notes Grid */}
      {userNotes.length === 0 ? (
        <div className="rc-glass-panel p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-500 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[#0F172A] mb-1">
            No Private Drafts Yet
          </h4>
          <p className="text-xs text-[#475569] max-w-sm mb-5 leading-relaxed">
            Take notes with our independent TipTap rich-text editor. Your drafts auto-save to localStorage safely.
          </p>
          <button
            onClick={onOpenCreateNote}
            className="rc-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
          >
            + Create First Note
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userNotes.map((note) => (
            <div
              key={note.id}
              className="rc-glass-card p-5 flex flex-col justify-between rounded-xl hover:border-slate-400 bg-white/70 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      note.isPublished
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-200 text-slate-700 border border-slate-300"
                    }`}
                  >
                    {note.isPublished ? "Published to Team" : "Private Draft"}
                  </span>

                  <button
                    onClick={() => onDeleteNote(note.id)}
                    title="Delete note"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h4 className="text-base font-bold text-[#0F172A] mb-1.5">
                  {note.title}
                </h4>

                <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed mb-4">
                  {note.preview || "No content snippet..."}
                </p>

                {/* Tags & Paper Reference */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {note.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="rc-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.paperTitle && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[200px]">
                      &sect; {note.paperTitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </span>

                <button
                  onClick={() => onEditNote(note)}
                  className="rc-btn-primary px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Open Editor &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
