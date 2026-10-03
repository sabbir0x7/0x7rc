import React, { useState } from "react";
import researchLogo from "@/assets/research/0x7-research-logo.png";
import { UserProfile, Project } from "../../types";

interface AppShellProps {
  currentUser: UserProfile | null;
  projects: Project[];
  activeProjectId: string | null;
  currentView: "dashboard" | "progress" | "workspace";
  onSelectDashboard: () => void;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  projects,
  activeProjectId,
  currentView,
  onSelectDashboard,
  onSelectProject,
  onOpenCreateProject,
  onLogout,
  children,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      {/* Top Branding & Nav */}
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-slate-300/40">
          <img
            src={researchLogo}
            alt="0x7 Logo"
            className="w-9 h-9 object-contain rounded-lg border border-slate-300/50 shadow-sm"
          />
          <div>
            <div className="rc-mono font-bold text-sm tracking-tight text-[#0F172A]">
              0x7 Research
            </div>
            <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
              Academic Center
            </div>
          </div>
        </div>

        {/* Primary Links */}
        <nav className="space-y-1 mb-6">
          <button
            onClick={() => {
              onSelectDashboard();
              setMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              currentView === "dashboard"
                ? "bg-white text-[#0F172A] shadow-sm border border-slate-300/40 font-semibold"
                : "text-[#475569] hover:bg-white/50 hover:text-[#0F172A]"
            }`}
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Dashboard</span>
          </button>
        </nav>

        {/* Projects Section Header */}
        <div className="px-3 mb-2 flex items-center justify-between">
          <span className="rc-mono text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Projects ({projects.length})
          </span>
          <button
            onClick={() => {
              onOpenCreateProject();
              setMobileDrawerOpen(false);
            }}
            title="Create Project"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Project Links List */}
        <div className="space-y-1 max-h-56 overflow-y-auto rc-custom-scrollbar pr-1">
          {projects.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-400 italic">
              No active projects yet. Click &apos;+&apos; to create.
            </div>
          ) : (
            projects.map((proj) => {
              const isActive = currentView === "workspace" && activeProjectId === proj.id;
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj.id);
                    setMobileDrawerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isActive
                      ? "bg-white text-[#0F172A] shadow-sm border border-slate-300/40 font-semibold"
                      : "text-[#475569] hover:bg-white/50 hover:text-[#0F172A]"
                  }`}
                >
                  <span className="truncate max-w-[140px] text-left">{proj.title}</span>
                  <span className="rc-mono text-[10px] text-slate-400 font-medium">
                    {proj.progress}%
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="pt-4 border-t border-slate-300/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white/50 border border-slate-300/30">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src={currentUser?.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=user"}
              alt="Avatar"
              className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300/60 flex-shrink-0"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-[#0F172A] truncate">
                {currentUser?.name || "Researcher"}
              </div>
              <div className="rc-mono text-[10px] text-slate-500 flex items-center gap-1">
                <span>{currentUser?.studentId || "0X7A"}</span>
                <span>&bull;</span>
                <span className="capitalize">{currentUser?.role || "Member"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#E5E7EB] text-[#0F172A]">
      {/* Desktop Persistent Left Sidebar */}
      <aside className="rc-sidebar-desktop">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-Over) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#F1F5F9] border-r border-slate-300 shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Topbar */}
        <header className="rc-topbar-mobile items-center justify-between px-4 py-3 bg-white/70 backdrop-blur-md border-b border-slate-300/40 sticky top-0 z-30">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-200/60"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="rc-mono font-bold text-sm text-[#0F172A]">0x7 Research Center</div>
          <div className="w-8" /> {/* spacer */}
        </header>

        {/* View Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
