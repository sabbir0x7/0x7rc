import React, { useState } from "react";
import "./styles/glassmorphism.css";
import { useResearchStore } from "./state/researchStore";
import { LandingPage } from "./components/landing/LandingPage";
import { AccountTypeModal } from "./components/auth/AccountTypeModal";
import { RegistrationModal } from "./components/auth/RegistrationModal";
import { LoginModal } from "./components/auth/LoginModal";
import { AppShell } from "./components/shell/AppShell";
import { DashboardView } from "./components/dashboard/DashboardView";
import { ProjectWorkspace } from "./components/workspace/ProjectWorkspace";
import { CreateProjectModal } from "./components/project-create/CreateProjectModal";
import { Role } from "./types";

interface ResearchCenterAppProps {
  initialAuthenticated?: boolean;
  initialView?: "landing" | "dashboard";
}

export const ResearchCenterApp: React.FC<ResearchCenterAppProps> = ({
  initialAuthenticated,
  initialView,
}) => {
  const {
    state,
    registerLeader,
    registerMember,
    login,
    logout,
    createProject,
    toggleRoadmapTask,
    saveNote,
    deleteNote,
    addPaper,
    deletePaper,
    addNotice,
    toggleNotice,
    deleteNotice,
    setActiveProject,
  } = useResearchStore();

  // Auth Modals state
  const [authModal, setAuthModal] = useState<"none" | "select_role" | "register" | "login">("none");
  const [selectedRole, setSelectedRole] = useState<Role>("leader");

  // Project Creation Modal state
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Current view: dashboard or workspace
  const [currentView, setCurrentView] = useState<"dashboard" | "workspace">(
    initialView === "dashboard" || state.activeProjectId ? "dashboard" : "dashboard"
  );

  const isAuthenticated =
    initialAuthenticated !== undefined
      ? initialAuthenticated || state.isAuthenticated
      : state.isAuthenticated;

  // If not authenticated, render landing page with auth modals
  if (!isAuthenticated) {
    return (
      <div className="rc-app-container">
        <LandingPage
          onOpenAuth={(mode = "select_role") => setAuthModal(mode)}
        />
        <AccountTypeModal
          isOpen={authModal === "select_role"}
          onClose={() => setAuthModal("none")}
          onSelectRole={(role) => {
            setSelectedRole(role);
            setAuthModal("register");
          }}
          onOpenLogin={() => setAuthModal("login")}
        />
        <RegistrationModal
          isOpen={authModal === "register"}
          role={selectedRole}
          onClose={() => setAuthModal("none")}
          onSuccess={() => {
            setAuthModal("none");
            setCurrentView("dashboard");
          }}
          onBackToRoles={() => setAuthModal("select_role")}
          registerLeader={registerLeader}
          registerMember={registerMember}
        />
        <LoginModal
          isOpen={authModal === "login"}
          onClose={() => setAuthModal("none")}
          onSuccess={() => {
            setAuthModal("none");
            setCurrentView("dashboard");
          }}
          onSwitchToRegister={() => setAuthModal("select_role")}
          login={login}
        />
      </div>
    );
  }

  // Active Project (if viewing workspace)
  const activeProject = state.projects.find((p) => p.id === state.activeProjectId) || null;

  return (
    <div className="rc-app-container">
      {/* Auth Modals if triggered while in app or from landing */}
      <AccountTypeModal
        isOpen={authModal === "select_role"}
        onClose={() => setAuthModal("none")}
        onSelectRole={(role) => {
          setSelectedRole(role);
          setAuthModal("register");
        }}
        onOpenLogin={() => setAuthModal("login")}
      />

      <RegistrationModal
        isOpen={authModal === "register"}
        role={selectedRole}
        onClose={() => setAuthModal("none")}
        onSuccess={() => {
          setAuthModal("none");
          setCurrentView("dashboard");
        }}
        onBackToRoles={() => setAuthModal("select_role")}
        registerLeader={registerLeader}
        registerMember={registerMember}
      />

      <LoginModal
        isOpen={authModal === "login"}
        onClose={() => setAuthModal("none")}
        onSuccess={() => {
          setAuthModal("none");
          setCurrentView("dashboard");
        }}
        onSwitchToRegister={() => setAuthModal("select_role")}
        login={login}
      />

      {/* Main Application Shell */}
      <AppShell
        currentUser={state.currentUser}
        projects={state.projects}
        activeProjectId={state.activeProjectId}
        currentView={currentView}
        onSelectDashboard={() => {
          setActiveProject(null);
          setCurrentView("dashboard");
        }}
        onSelectProject={(projectId) => {
          setActiveProject(projectId);
          setCurrentView("workspace");
        }}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onLogout={() => {
          logout();
          setAuthModal("none");
        }}
      >
        {currentView === "dashboard" || !activeProject ? (
          <DashboardView
            projects={state.projects}
            notes={state.notes}
            papers={state.papers}
            notices={state.notices}
            onSelectProject={(projectId) => {
              setActiveProject(projectId);
              setCurrentView("workspace");
            }}
            onOpenCreateProject={() => setIsCreateProjectOpen(true)}
            onAddNotice={addNotice}
            onToggleNotice={toggleNotice}
            onDeleteNotice={deleteNotice}
          />
        ) : (
          <ProjectWorkspace
            project={activeProject}
            notes={state.notes}
            papers={state.papers}
            phases={state.roadmapPhases}
            teamMembers={state.currentTeam?.members || []}
            team={state.currentTeam}
            currentUserId={state.currentUser?.id || "anon"}
            onBackToDashboard={() => {
              setActiveProject(null);
              setCurrentView("dashboard");
            }}
            onToggleRoadmapTask={toggleRoadmapTask}
            onSaveNote={saveNote}
            onDeleteNote={deleteNote}
            onAddPaper={addPaper}
            onDeletePaper={deletePaper}
          />
        )}
      </AppShell>

      {/* Create Project Modal */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          teamMembers={state.currentTeam?.members || []}
          currentUserId={state.currentUser?.id || "anon"}
          onCreateProject={(title, desc, members) => {
            const newProj = createProject(title, desc, members);
            setIsCreateProjectOpen(false);
            if (newProj) {
              setActiveProject(newProj.id);
              setCurrentView("workspace");
            }
          }}
        />
      )}
    </div>
  );
};

export default ResearchCenterApp;
