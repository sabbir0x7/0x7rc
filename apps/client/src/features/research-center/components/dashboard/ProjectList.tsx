import React from "react";
import { Project } from "../../types";

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onOpenCreateModal: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onSelectProject,
  onOpenCreateModal,
}) => {
  return (
    <div className="rc-glass-panel p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-300/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          <h2 className="text-base font-bold text-[#0F172A]">Research Projects</h2>
          <span className="rc-mono text-xs px-2 py-0.5 rounded-full bg-white/70 border border-slate-300/50 text-slate-600 font-semibold">
            {projects.length}
          </span>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="rc-btn-primary px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Container */}
      <div className="flex-1 overflow-y-auto rc-custom-scrollbar mt-3 pr-1 min-h-[260px]">
        {projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-300/60 rounded-xl my-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/80 border border-slate-200 flex items-center justify-center text-slate-700 mb-4 shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[#0F172A] mb-1">
              No Active Projects Yet
            </h3>
            <p className="text-xs text-[#475569] max-w-sm mb-5 leading-relaxed">
              Four minds, one objective. Create your team&apos;s first research project to begin collecting papers, drafting notes, and sequencing the 5-phase roadmap.
            </p>
            <button
              onClick={onOpenCreateModal}
              className="rc-btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 shadow-sm"
            >
              <span>+ Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className="rc-glass-card p-4 sm:p-5 flex flex-col justify-between hover:border-slate-400 bg-white/60 hover:bg-white/90 transition-all rounded-xl cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-[#0F172A] group-hover:text-black">
                      {proj.title}
                    </h3>
                    <span className="rc-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300/60 text-slate-800">
                      {proj.progress}%
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] line-clamp-2 leading-relaxed mb-4">
                    {proj.description || "No description provided."}
                  </p>
                </div>

                {/* Card Footer: Metrics & Avatars */}
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>{proj.notesCount} notes</span>
                    </span>

                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span>{proj.papersCount} papers</span>
                    </span>
                  </div>

                  <div className="flex items-center text-[#0F172A] font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Open Workspace &rarr;</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
