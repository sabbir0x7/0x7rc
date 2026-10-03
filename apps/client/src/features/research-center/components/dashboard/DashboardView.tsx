import React from "react";
import { Project, Note, Paper, NoticeItem } from "../../types";
import { SummaryMetrics } from "./SummaryMetrics";
import { NoticeBoard } from "./NoticeBoard";
import { ProjectList } from "./ProjectList";
import { useResizableSplit } from "../../hooks/useResizableSplit";

interface DashboardViewProps {
  projects: Project[];
  notes: Note[];
  papers: Paper[];
  notices: NoticeItem[];
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  onAddNotice: (title: string, content: string, type: "notice" | "todo", dueDate?: string) => void;
  onToggleNotice: (id: string) => void;
  onDeleteNotice: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  notes,
  papers,
  notices,
  onSelectProject,
  onOpenCreateProject,
  onAddNotice,
  onToggleNotice,
  onDeleteNotice,
}) => {
  const {
    containerRef,
    splitPercent,
    isDragging,
    separatorProps,
    resetToHalf,
  } = useResizableSplit({
    initialPercent: 50,
    minPercent: 25,
    maxPercent: 75,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Overview &amp; Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Research Team Dashboard
          </h1>
        </div>

        <button
          onClick={onOpenCreateProject}
          className="rc-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Initiate Research Project</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <SummaryMetrics projects={projects} notes={notes} papers={papers} />

      {/* 50/50 Resizable Split Container */}
      <div
        ref={containerRef}
        className={`relative flex flex-row items-stretch gap-0 w-full min-h-[580px] rounded-2xl overflow-hidden border border-slate-300/40 bg-[#E2E8F0]/30 p-2 sm:p-3 ${
          isDragging ? "select-none cursor-col-resize" : ""
        }`}
      >
        {/* Left Side: Notice Board */}
        <div
          style={{ width: `${splitPercent}%` }}
          className="transition-all flex-shrink-0 flex flex-col min-w-0"
        >
          <NoticeBoard
            notices={notices}
            onAddNotice={onAddNotice}
            onToggleNotice={onToggleNotice}
            onDeleteNotice={onDeleteNotice}
          />
        </div>

        {/* Resizable Divider Handle */}
        <div
          {...separatorProps}
          onDoubleClick={resetToHalf}
          className="flex items-center justify-center w-3 mx-1 group cursor-col-resize select-none relative z-20 outline-none flex-shrink-0"
          title="Drag to resize Notice Board and Projects (Double click to reset 50/50, or use Arrow Keys)"
        >
          <div
            className={`w-1 h-24 rounded-full transition-all ${
              isDragging
                ? "bg-slate-700 w-1.5"
                : "bg-slate-300 group-hover:bg-slate-500 group-focus:bg-slate-600"
            }`}
          />
        </div>

        {/* Right Side: Projects List */}
        <div
          style={{ width: `calc(100% - ${splitPercent}% - 1rem)` }}
          className="transition-all flex-1 min-w-0 flex-shrink-0 flex flex-col"
        >
          <ProjectList
            projects={projects}
            onSelectProject={onSelectProject}
            onOpenCreateModal={onOpenCreateProject}
          />
        </div>
      </div>
    </div>
  );
};
