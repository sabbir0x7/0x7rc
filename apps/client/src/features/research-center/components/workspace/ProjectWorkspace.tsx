import React, { useState } from "react";
import {
  Project,
  Note,
  Paper,
  RoadmapPhase,
  TeamMember,
  Team,
  WorkspaceTab,
} from "../../types";
import { ProgressionGraphTab } from "./tabs/ProgressionGraphTab";
import { YourNotesTab } from "./tabs/YourNotesTab";
import { PublishedNotesTab } from "./tabs/PublishedNotesTab";
import { SharedPapersTab } from "./tabs/SharedPapersTab";
import { RoadmapTab } from "./tabs/RoadmapTab";
import { MembersTab } from "./tabs/MembersTab";
import { TipTapEditorModal } from "../editor/TipTapEditorModal";

interface ProjectWorkspaceProps {
  project: Project;
  notes: Note[];
  papers: Paper[];
  phases: RoadmapPhase[];
  teamMembers: TeamMember[];
  team: Team | null;
  currentUserId: string;
  onBackToDashboard: () => void;
  onToggleRoadmapTask: (taskId: string) => void;
  onSaveNote: (noteData: any) => void;
  onDeleteNote: (noteId: string) => void;
  onAddPaper: (paperData: any) => void;
  onDeletePaper: (paperId: string) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  notes,
  papers,
  phases,
  teamMembers,
  team,
  currentUserId,
  onBackToDashboard,
  onToggleRoadmapTask,
  onSaveNote,
  onDeleteNote,
  onAddPaper,
  onDeletePaper,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("progression");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const projectNotes = notes.filter((n) => n.projectId === project.id);
  const projectPapers = papers.filter((p) => p.projectId === project.id);
  const projectPhases = phases.filter((p) => p.projectId === project.id);

  const tabs: { key: WorkspaceTab; label: string; count?: number }[] = [
    { key: "progression", label: "Progression Graph" },
    {
      key: "notes",
      label: "Your Notes",
      count: projectNotes.filter((n) => n.authorId === currentUserId).length,
    },
    {
      key: "published",
      label: "Published Notes",
      count: projectNotes.filter((n) => n.isPublished).length,
    },
    {
      key: "papers",
      label: "Shared PDFs",
      count: projectPapers.length,
    },
    { key: "roadmap", label: "Roadmap (5 Phases)" },
    { key: "members", label: "Members", count: teamMembers.length },
  ];

  const handleOpenNewNote = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-300/40">
        <div>
          <button
            onClick={onBackToDashboard}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 mb-2 transition-colors"
          >
            <span>&larr;</span> <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {project.title}
            </h1>
            <span className="rc-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-300 text-slate-800 shadow-sm">
              {project.progress}% Complete
            </span>
          </div>

          <p className="text-xs text-[#475569] mt-1 max-w-2xl">
            {project.description || "Active academic research workspace with 4-person isolation."}
          </p>
        </div>

        {/* Member Avatar Stack & Fast Note Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center -space-x-2">
            {teamMembers.map((m) => (
              <img
                key={m.id}
                src={m.avatar}
                alt={m.name}
                title={`${m.name} (${m.role})`}
                className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 shadow-sm"
              />
            ))}
          </div>

          <button
            onClick={handleOpenNewNote}
            className="rc-btn-primary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Take Note</span>
          </button>
        </div>
      </div>

      {/* 6 Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 rc-custom-scrollbar border-b border-slate-300/40">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-white text-[#0F172A] shadow-sm font-bold border border-slate-300/50"
                  : "text-[#475569] hover:bg-white/50 hover:text-[#0F172A]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rc-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? "bg-slate-100 text-slate-800"
                      : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {activeTab === "progression" && (
          <ProgressionGraphTab project={project} phases={projectPhases} />
        )}

        {activeTab === "notes" && (
          <YourNotesTab
            notes={projectNotes}
            currentUserId={currentUserId}
            onOpenCreateNote={handleOpenNewNote}
            onEditNote={handleEditNote}
            onDeleteNote={onDeleteNote}
          />
        )}

        {activeTab === "published" && (
          <PublishedNotesTab notes={projectNotes} />
        )}

        {activeTab === "papers" && (
          <SharedPapersTab
            papers={projectPapers}
            projectId={project.id}
            onAddPaper={onAddPaper}
            onDeletePaper={onDeletePaper}
          />
        )}

        {activeTab === "roadmap" && (
          <RoadmapTab
            project={project}
            phases={projectPhases}
            onToggleTask={onToggleRoadmapTask}
          />
        )}

        {activeTab === "members" && (
          <MembersTab members={teamMembers} team={team} />
        )}
      </div>

      {/* TipTap Rich-Text Editor Modal */}
      {isEditorOpen && (
        <TipTapEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          projectId={project.id}
          existingNote={editingNote}
          projectPapers={projectPapers}
          onSaveNote={onSaveNote}
        />
      )}
    </div>
  );
};
