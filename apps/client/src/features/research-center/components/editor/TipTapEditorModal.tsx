import React, { useState, useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Link from "@tiptap/extension-link";
import DOMPurify from "dompurify";
import { Note, Paper } from "../../types";
import { usePrivateDrafts } from "../../hooks/usePrivateDrafts";

interface TipTapEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  existingNote?: Note | null;
  projectPapers: Paper[];
  onSaveNote: (noteData: {
    id?: string;
    projectId: string;
    title: string;
    bodyHtml: string;
    tags: string[];
    paperId?: string;
    paperTitle?: string;
    isPublished: boolean;
  }) => void;
}

export const TipTapEditorModal: React.FC<TipTapEditorModalProps> = ({
  isOpen,
  onClose,
  projectId,
  existingNote,
  projectPapers,
  onSaveNote,
}) => {
  const [title, setTitle] = useState(existingNote?.title || "");
  const [tagsInput, setTagsInput] = useState(existingNote?.tags?.join(", ") || "");
  const [selectedPaperId, setSelectedPaperId] = useState(existingNote?.paperId || "");
  const [isPublished, setIsPublished] = useState(existingNote?.isPublished ?? false);

  const { saveStatus, lastSavedAt, loadDraft, saveDraft, clearDraft } =
    usePrivateDrafts(existingNote?.id || null);

  const initialContent = useMemo(() => {
    if (existingNote?.bodyHtml) {
      return existingNote.bodyHtml;
    }
    const saved = loadDraft();
    if (saved?.bodyHtml) {
      return saved.bodyHtml;
    }
    return "<p>Begin formulating your academic hypothesis, experimental notes, or literature synthesis here...</p>";
  }, [existingNote, loadDraft]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-slate-800 underline font-medium",
        },
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      saveDraft({
        title,
        bodyHtml: html,
        tags,
        paperId: selectedPaperId || undefined,
        isPublished,
      });
    },
  });

  // Keep auto-save synced when metadata changes
  useEffect(() => {
    if (!editor) return;
    const html = editor.getHTML();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    saveDraft({
      title,
      bodyHtml: html,
      tags,
      paperId: selectedPaperId || undefined,
      isPublished,
    });
  }, [title, tagsInput, selectedPaperId, isPublished, editor, saveDraft]);

  if (!isOpen) return null;

  const wordCount = editor
    ? editor.getText().trim().split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = editor ? editor.getText().length : 0;

  const handleManualSave = (publishState?: boolean) => {
    if (!editor) return;
    const finalPublish = publishState !== undefined ? publishState : isPublished;
    const rawHtml = editor.getHTML();
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const linkedPaper = projectPapers.find((p) => p.id === selectedPaperId);

    onSaveNote({
      id: existingNote?.id,
      projectId,
      title: title.trim() || "Untitled Note",
      bodyHtml: sanitizedHtml,
      tags,
      paperId: selectedPaperId || undefined,
      paperTitle: linkedPaper?.title,
      isPublished: finalPublish,
    });

    clearDraft();
    onClose();
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter academic link URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertTable = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rc-glass-panel relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white/95 backdrop-blur-2xl border border-slate-300 shadow-2xl overflow-hidden rounded-2xl">
        {/* Top Header Bar */}
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <div className="rc-mono text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                TipTap Rich-Text Engine
              </div>
              <h3 className="text-sm font-bold text-[#0F172A]">
                {existingNote ? "Edit Research Note" : "Compose Private Draft"}
              </h3>
            </div>
          </div>

          {/* Auto-save & Status indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span
                className={`w-2 h-2 rounded-full ${
                  saveStatus === "saving"
                    ? "bg-amber-500 animate-ping"
                    : saveStatus === "saved"
                    ? "bg-emerald-500"
                    : "bg-slate-400"
                }`}
              />
              <span className="rc-mono text-[11px]">
                {saveStatus === "saving"
                  ? "Auto-saving..."
                  : saveStatus === "saved"
                  ? "Saved (Local)"
                  : "Draft ready"}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Note Metadata Section */}
        <div className="p-4 sm:px-6 bg-white/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Note Title (e.g. Analysis of Attention Heads in Transformer-XL)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-lg sm:text-xl font-bold text-[#0F172A] placeholder:text-slate-400 border-none outline-none bg-transparent"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              placeholder="#Ablation, #Attention"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="rc-glass-input w-full px-2.5 py-1.5 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Linked Research Paper
            </label>
            <select
              value={selectedPaperId}
              onChange={(e) => setSelectedPaperId(e.target.value)}
              className="rc-glass-input w-full px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="">None (Independent Note)</option>
              {projectPapers.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.title.substring(0, 36)}... ({paper.year})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer pb-1 text-xs text-[#0F172A] font-semibold">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0 cursor-pointer"
              />
              <span>Publish to Team Workspace</span>
            </label>
          </div>
        </div>

        {/* TipTap Rich Formatting Toolbar */}
        {editor && (
          <div className="p-2 sm:px-6 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center gap-1 text-xs">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`px-2 py-1 rounded font-bold ${
                editor.isActive("heading", { level: 1 })
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`px-2 py-1 rounded font-bold ${
                editor.isActive("heading", { level: 2 })
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().setParagraph().run()}
              className={`px-2 py-1 rounded font-medium ${
                editor.isActive("paragraph")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              P
            </button>
            <span className="text-slate-300">|</span>

            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1 rounded font-bold ${
                editor.isActive("bold")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 rounded italic font-serif ${
                editor.isActive("italic")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`px-2 py-1 rounded line-through ${
                editor.isActive("strike")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              S
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`rc-mono px-2 py-1 rounded text-[11px] ${
                editor.isActive("code")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              &lt;/&gt;
            </button>
            <span className="text-slate-300">|</span>

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`px-2 py-1 rounded ${
                editor.isActive("bulletList")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              &bull; List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`px-2 py-1 rounded ${
                editor.isActive("orderedList")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              1. List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`px-2 py-1 rounded ${
                editor.isActive("blockquote")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              &ldquo; Quote
            </button>
            <span className="text-slate-300">|</span>

            <button
              onClick={setLink}
              className={`px-2 py-1 rounded ${
                editor.isActive("link")
                  ? "bg-slate-800 text-white"
                  : "hover:bg-slate-200 text-slate-700"
              }`}
            >
              Link
            </button>
            <button
              onClick={insertTable}
              className="px-2 py-1 rounded hover:bg-slate-200 text-slate-700 flex items-center gap-1"
            >
              <span>Table</span>
            </button>
            <span className="text-slate-300">|</span>

            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="px-2 py-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
            >
              Undo
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="px-2 py-1 rounded hover:bg-slate-200 text-slate-600 disabled:opacity-30"
            >
              Redo
            </button>
          </div>
        )}

        {/* TipTap Editor Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px] max-h-[50vh] prose prose-slate max-w-none focus:outline-none rc-custom-scrollbar">
          <EditorContent
            editor={editor}
            className="min-h-[260px] outline-none text-sm text-[#0F172A] leading-relaxed"
          />
        </div>

        {/* Bottom Footer: Word Count & Save Actions */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="rc-mono text-slate-500 flex items-center gap-3">
            <span>Words: <strong>{wordCount}</strong></span>
            <span>&bull;</span>
            <span>Chars: <strong>{charCount}</strong></span>
            {lastSavedAt && (
              <>
                <span>&bull;</span>
                <span className="text-slate-400">
                  Last saved: {lastSavedAt.toLocaleTimeString()}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleManualSave(false)}
              className="rc-btn-secondary px-4 py-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              Save as Private Draft
            </button>

            <button
              type="button"
              onClick={() => handleManualSave(true)}
              className="rc-btn-primary px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
            >
              Publish to Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
