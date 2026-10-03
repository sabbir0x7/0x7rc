import React, { useState } from "react";
import DOMPurify from "dompurify";
import { Note } from "../../../types";

interface PublishedNotesTabProps {
  notes: Note[];
}

export const PublishedNotesTab: React.FC<PublishedNotesTabProps> = ({ notes }) => {
  const publishedNotes = notes.filter((n) => n.isPublished);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-[#0F172A]">Published Team Findings</h3>
        <p className="text-xs text-[#475569]">
          Shared notes and synthesized findings visible across your 4-person research team.
        </p>
      </div>

      {publishedNotes.length === 0 ? (
        <div className="rc-glass-panel p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-500 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[#0F172A] mb-1">
            No Published Findings Yet
          </h4>
          <p className="text-xs text-[#475569] max-w-sm leading-relaxed">
            Team members can draft private notes in &apos;Your Notes&apos; and switch them to &apos;Publish to Team Workspace&apos; when ready.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publishedNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => setSelectedNote(note)}
              className="rc-glass-card p-5 rounded-xl border border-slate-300/60 bg-white/70 hover:bg-white/90 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img
                    src={note.authorAvatar}
                    alt={note.authorName}
                    className="w-6 h-6 rounded-full border border-slate-300"
                  />
                  <div className="text-xs font-semibold text-[#0F172A]">
                    {note.authorName}
                  </div>
                  <span className="text-slate-300">&bull;</span>
                  <div className="text-[11px] text-slate-500">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <h4 className="text-base font-bold text-[#0F172A] mb-2">
                  {note.title}
                </h4>

                <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed mb-4">
                  {note.preview}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {note.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="rc-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.paperTitle && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[200px]">
                      Paper: {note.paperTitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px]">Click to view full manuscript</span>
                <span className="font-semibold text-[#0F172A]">Read &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Note Modal View (DOMPurify Sanitized) */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rc-glass-panel relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white p-7 rounded-2xl shadow-2xl overflow-hidden">
            <button
              onClick={() => setSelectedNote(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src={selectedNote.authorAvatar}
                alt={selectedNote.authorName}
                className="w-10 h-10 rounded-full border border-slate-300"
              />
              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {selectedNote.authorName}
                </div>
                <div className="text-xs text-slate-500">
                  Published on {new Date(selectedNote.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-[#0F172A] mb-3">
              {selectedNote.title}
            </h2>

            {selectedNote.paperTitle && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-700">
                <span>Associated Reference:</span>
                <strong>{selectedNote.paperTitle}</strong>
              </div>
            )}

            <div
              className="flex-1 overflow-y-auto prose prose-slate max-w-none text-sm leading-relaxed rc-custom-scrollbar pr-2 border-t border-slate-200 pt-4"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(selectedNote.bodyHtml),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
