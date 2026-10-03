import React, { useState } from "react";
import { Paper } from "../../../types";

interface SharedPapersTabProps {
  papers: Paper[];
  projectId: string;
  onAddPaper: (paperData: {
    projectId: string;
    title: string;
    authors: string;
    year: number;
    journalOrConference: string;
    url: string;
    fileUrl?: string;
    fileName?: string;
    abstract: string;
    tags: string[];
  }) => void;
  onDeletePaper: (paperId: string) => void;
}

export const SharedPapersTab: React.FC<SharedPapersTabProps> = ({
  papers,
  projectId,
  onAddPaper,
  onDeletePaper,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [venue, setVenue] = useState("");
  const [url, setUrl] = useState("");
  const [abstract, setAbstract] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onAddPaper({
      projectId,
      title: title.trim(),
      authors: authors.trim() || "Anonymous",
      year: year || new Date().getFullYear(),
      journalOrConference: venue.trim() || "ArXiv",
      url: url.trim(),
      fileName: selectedFile ? selectedFile.name : undefined,
      abstract: abstract.trim(),
      tags,
    });

    setTitle("");
    setAuthors("");
    setVenue("");
    setUrl("");
    setAbstract("");
    setTagsInput("");
    setSelectedFile(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Shared PDF Library</h3>
          <p className="text-xs text-[#475569]">
            Seminal papers, preprints, and literature collected for this research project.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="rc-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Research Paper</span>
        </button>
      </div>

      {/* Add Paper Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rc-glass-panel relative w-full max-w-lg p-7 bg-white/95 backdrop-blur-2xl border border-slate-300 shadow-2xl rounded-2xl">
            <button
              onClick={() => setIsAdding(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-[#0F172A] mb-1">
              Add Paper to Repository
            </h3>
            <p className="text-xs text-[#475569] mb-4">
              Enter academic citation details or upload a PDF manuscript.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Attention Is All You Need"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rc-glass-input w-full px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Authors
                  </label>
                  <input
                    type="text"
                    placeholder="Vaswani et al."
                    value={authors}
                    onChange={(e) => setAuthors(e.target.value)}
                    className="rc-glass-input w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
                    className="rc-glass-input w-full px-3 py-2 text-xs rc-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Conference / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="NeurIPS, ICML, ArXiv"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="rc-glass-input w-full px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Paper URL / DOI
                  </label>
                  <input
                    type="url"
                    placeholder="https://arxiv.org/abs/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="rc-glass-input w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  PDF Document Upload
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="rc-glass-input w-full px-3 py-1.5 text-xs text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Abstract / Executive Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="Key contributions and methodology..."
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  className="rc-glass-input w-full px-3 py-1.5 text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rc-btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                >
                  Save Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Papers Grid */}
      {papers.length === 0 ? (
        <div className="rc-glass-panel p-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-200/60 flex items-center justify-center text-slate-500 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-[#0F172A] mb-1">
            No Papers Collected Yet
          </h4>
          <p className="text-xs text-[#475569] max-w-sm mb-5 leading-relaxed">
            Begin assembling your team&apos;s bibliography by adding ArXiv preprints or uploading PDF manuscripts.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="rc-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
          >
            + Add First Paper
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="rc-glass-card p-5 rounded-xl border border-slate-300/60 bg-white/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="rc-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {paper.journalOrConference} &bull; {paper.year}
                  </span>

                  <button
                    onClick={() => onDeletePaper(paper.id)}
                    title="Delete paper"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h4 className="text-base font-bold text-[#0F172A] mb-1">
                  {paper.title}
                </h4>

                <div className="text-xs font-medium text-slate-600 mb-3">
                  {paper.authors}
                </div>

                {paper.abstract && (
                  <p className="text-xs text-[#475569] line-clamp-3 leading-relaxed mb-4">
                    {paper.abstract}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  Added by {paper.addedByName}
                </span>

                <div className="flex items-center gap-2">
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rc-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>Open URL</span>
                    </a>
                  )}
                  {paper.fileName && (
                    <span className="rc-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      &darr; {paper.fileName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
