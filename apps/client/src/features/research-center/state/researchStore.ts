import { useState, useEffect, useCallback } from "react";
import {
  UserProfile,
  Team,
  TeamMember,
  Project,
  Note,
  Paper,
  NoticeItem,
  RoadmapPhase,
} from "../types";

const STORAGE_KEY = "0x7_research_center_state_v2";

interface ResearchState {
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  currentTeam: Team | null;
  projects: Project[];
  notes: Note[];
  papers: Paper[];
  notices: NoticeItem[];
  roadmapPhases: RoadmapPhase[];
  activeProjectId: string | null;
}

const DEFAULT_INITIAL_STATE: ResearchState = {
  isAuthenticated: false,
  currentUser: null,
  currentTeam: null,
  // STRICT REQUIREMENT: Completely empty on initial start (0 projects, 0 notes, 0 papers, 0 notices)
  projects: [],
  notes: [],
  papers: [],
  notices: [],
  roadmapPhases: [],
  activeProjectId: null,
};

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function useResearchStore() {
  const [state, setState] = useState<ResearchState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...DEFAULT_INITIAL_STATE, ...parsed };
        }
      } catch (e) {
        console.error("Error loading research store state", e);
      }
    }
    return DEFAULT_INITIAL_STATE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving research store state", e);
    }
  }, [state]);

  // Auth: Register as Leader
  const registerLeader = useCallback(
    (teamName: string, leaderName: string, studentId: string, email: string) => {
      const leaderId = generateId("usr");
      const teamId = generateId("team");
      const referralCode = `0X7-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const leaderUser: UserProfile = {
        id: leaderId,
        name: leaderName,
        studentId: studentId.trim().toUpperCase(),
        email: email || `${studentId.toLowerCase()}@research.univ.edu`,
        role: "leader",
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${leaderName}`,
        teamId,
        teamName,
      };

      const leaderMember: TeamMember = {
        id: leaderId,
        name: leaderName,
        studentId: leaderUser.studentId,
        email: leaderUser.email,
        role: "leader",
        avatar: leaderUser.avatar,
        notesCount: 0,
        papersCount: 0,
        tasksCount: 0,
        contributionShare: 100,
      };

      const newTeam: Team = {
        id: teamId,
        name: teamName,
        leaderId,
        referralCode,
        members: [leaderMember],
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        currentUser: leaderUser,
        currentTeam: newTeam,
      }));

      return { user: leaderUser, team: newTeam };
    },
    []
  );

  // Auth: Register as Member
  const registerMember = useCallback(
    (referralCode: string, memberName: string, studentId: string, email: string) => {
      const memberId = generateId("usr");
      const teamId = generateId("team");

      const memberUser: UserProfile = {
        id: memberId,
        name: memberName,
        studentId: studentId.trim().toUpperCase(),
        email: email || `${studentId.toLowerCase()}@research.univ.edu`,
        role: "member",
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${memberName}`,
        teamId,
        teamName: "0x7 Research Group",
      };

      const memberItem: TeamMember = {
        id: memberId,
        name: memberName,
        studentId: memberUser.studentId,
        email: memberUser.email,
        role: "member",
        avatar: memberUser.avatar,
        notesCount: 0,
        papersCount: 0,
        tasksCount: 0,
        contributionShare: 100,
      };

      const newTeam: Team = {
        id: teamId,
        name: "0x7 Research Group",
        leaderId: "leader_demo",
        referralCode: referralCode.toUpperCase(),
        members: [memberItem],
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        currentUser: memberUser,
        currentTeam: prev.currentTeam
          ? {
              ...prev.currentTeam,
              members: [...prev.currentTeam.members.filter((m) => m.id !== memberId), memberItem],
            }
          : newTeam,
      }));

      return { user: memberUser, team: newTeam };
    },
    []
  );

  // Auth: Direct Login with Student ID + Password
  const login = useCallback((studentId: string, _password: string) => {
    const cleanId = studentId.trim().toUpperCase();
    const userId = generateId("usr");
    const user: UserProfile = {
      id: userId,
      name: `Researcher ${cleanId}`,
      studentId: cleanId,
      email: `${cleanId.toLowerCase()}@research.univ.edu`,
      role: "leader",
      avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${cleanId}`,
      teamId: "team_default",
      teamName: "0x7 Lab",
    };

    const team: Team = {
      id: "team_default",
      name: "0x7 Lab",
      leaderId: userId,
      referralCode: "0X7-A9B2",
      members: [
        {
          id: userId,
          name: user.name,
          studentId: user.studentId,
          email: user.email,
          role: "leader",
          avatar: user.avatar,
          notesCount: 0,
          papersCount: 0,
          tasksCount: 0,
          contributionShare: 100,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      currentUser: prev.currentUser || user,
      currentTeam: prev.currentTeam || team,
    }));
  }, []);

  const logout = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      currentUser: null,
    }));
  }, []);

  // Project: Create (Max 4 members)
  const createProject = useCallback(
    (title: string, description: string, memberIds: string[]) => {
      const projectId = generateId("proj");
      const newProject: Project = {
        id: projectId,
        title,
        description,
        progress: 0,
        status: "in_progress",
        memberIds: memberIds.slice(0, 4), // strict 4-member limit
        createdAt: new Date().toISOString(),
        notesCount: 0,
        papersCount: 0,
      };

      // Create default 5-phase academic roadmap
      const defaultPhases: RoadmapPhase[] = [
        {
          id: generateId("ph1"),
          projectId,
          title: "Phase 1: Literature Review & Problem Definition",
          order: 1,
          tasks: [
            { id: generateId("t1"), phaseId: "ph1", title: "Survey 15 seminal papers", isCompleted: false },
            { id: generateId("t2"), phaseId: "ph1", title: "Formulate research hypothesis", isCompleted: false },
          ],
        },
        {
          id: generateId("ph2"),
          projectId,
          title: "Phase 2: Dataset Preparation & Preprocessing",
          order: 2,
          tasks: [
            { id: generateId("t3"), phaseId: "ph2", title: "Collect and clean raw benchmarks", isCompleted: false },
            { id: generateId("t4"), phaseId: "ph2", title: "Feature extraction pipeline", isCompleted: false },
          ],
        },
        {
          id: generateId("ph3"),
          projectId,
          title: "Phase 3: Architecture & Model Prototyping",
          order: 3,
          tasks: [
            { id: generateId("t5"), phaseId: "ph3", title: "Implement baseline model", isCompleted: false },
            { id: generateId("t6"), phaseId: "ph3", title: "Hyperparameter search experiments", isCompleted: false },
          ],
        },
        {
          id: generateId("ph4"),
          projectId,
          title: "Phase 4: Comparative Evaluation & Ablation",
          order: 4,
          tasks: [
            { id: generateId("t7"), phaseId: "ph4", title: "Run statistical significance tests", isCompleted: false },
            { id: generateId("t8"), phaseId: "ph4", title: "Generate metric curves & charts", isCompleted: false },
          ],
        },
        {
          id: generateId("ph5"),
          projectId,
          title: "Phase 5: Manuscript Writing & Conference Submission",
          order: 5,
          tasks: [
            { id: generateId("t9"), phaseId: "ph5", title: "Draft introduction & methodology", isCompleted: false },
            { id: generateId("t10"), phaseId: "ph5", title: "Peer review within 4-person team", isCompleted: false },
          ],
        },
      ];

      setState((prev) => ({
        ...prev,
        projects: [newProject, ...prev.projects],
        roadmapPhases: [...prev.roadmapPhases, ...defaultPhases],
        activeProjectId: projectId,
      }));

      return newProject;
    },
    []
  );

  // Roadmap: Toggle Task & Recalculate Overall Progress
  const toggleRoadmapTask = useCallback((taskId: string) => {
    setState((prev) => {
      let targetProjectId: string | null = null;

      const updatedPhases = prev.roadmapPhases.map((phase) => {
        const hasTask = phase.tasks.some((t) => t.id === taskId);
        if (hasTask) {
          targetProjectId = phase.projectId;
          return {
            ...phase,
            tasks: phase.tasks.map((t) =>
              t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
            ),
          };
        }
        return phase;
      });

      // Recalculate overall progress for the target project
      const updatedProjects = prev.projects.map((proj) => {
        if (proj.id === targetProjectId) {
          const projectPhases = updatedPhases.filter((p) => p.projectId === proj.id);
          const allTasks = projectPhases.flatMap((p) => p.tasks);
          const completedTasks = allTasks.filter((t) => t.isCompleted);
          const calculatedProgress =
            allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0;

          return {
            ...proj,
            progress: calculatedProgress,
            status: calculatedProgress === 100 ? ("completed" as const) : ("in_progress" as const),
          };
        }
        return proj;
      });

      return {
        ...prev,
        roadmapPhases: updatedPhases,
        projects: updatedProjects,
      };
    });
  }, []);

  // Notes: Add / Update Note
  const saveNote = useCallback(
    (noteData: {
      id?: string;
      projectId: string;
      title: string;
      bodyHtml: string;
      tags: string[];
      paperId?: string;
      paperTitle?: string;
      isPublished: boolean;
    }) => {
      setState((prev) => {
        const preview = noteData.bodyHtml.replace(/<[^>]*>/g, "").substring(0, 140);
        const existingIndex = prev.notes.findIndex((n) => n.id === noteData.id);

        let newNotes: Note[];
        if (existingIndex >= 0) {
          newNotes = [...prev.notes];
          newNotes[existingIndex] = {
            ...newNotes[existingIndex],
            title: noteData.title,
            bodyHtml: noteData.bodyHtml,
            preview,
            tags: noteData.tags,
            paperId: noteData.paperId,
            paperTitle: noteData.paperTitle,
            isPublished: noteData.isPublished,
            updatedAt: new Date().toISOString(),
          };
        } else {
          const newNote: Note = {
            id: noteData.id || generateId("note"),
            projectId: noteData.projectId,
            authorId: prev.currentUser?.id || "anon",
            authorName: prev.currentUser?.name || "Researcher",
            authorAvatar:
              prev.currentUser?.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=author",
            title: noteData.title || "Untitled Note",
            bodyHtml: noteData.bodyHtml,
            preview,
            tags: noteData.tags,
            paperId: noteData.paperId,
            paperTitle: noteData.paperTitle,
            isPublished: noteData.isPublished,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          newNotes = [newNote, ...prev.notes];
        }

        // Update project notes count
        const updatedProjects = prev.projects.map((p) =>
          p.id === noteData.projectId
            ? { ...p, notesCount: newNotes.filter((n) => n.projectId === p.id).length }
            : p
        );

        return {
          ...prev,
          notes: newNotes,
          projects: updatedProjects,
        };
      });
    },
    []
  );

  const deleteNote = useCallback((noteId: string) => {
    setState((prev) => {
      const target = prev.notes.find((n) => n.id === noteId);
      const filtered = prev.notes.filter((n) => n.id !== noteId);
      const updatedProjects = prev.projects.map((p) =>
        target && p.id === target.projectId
          ? { ...p, notesCount: filtered.filter((n) => n.projectId === p.id).length }
          : p
      );
      return {
        ...prev,
        notes: filtered,
        projects: updatedProjects,
      };
    });
  }, []);

  // Papers: Add Paper
  const addPaper = useCallback(
    (paperData: {
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
    }) => {
      const newPaper: Paper = {
        id: generateId("paper"),
        projectId: paperData.projectId,
        title: paperData.title,
        authors: paperData.authors,
        year: paperData.year || new Date().getFullYear(),
        journalOrConference: paperData.journalOrConference || "ArXiv",
        url: paperData.url,
        fileUrl: paperData.fileUrl,
        fileName: paperData.fileName,
        abstract: paperData.abstract,
        tags: paperData.tags || [],
        addedBy: state.currentUser?.id || "anon",
        addedByName: state.currentUser?.name || "Researcher",
        addedAt: new Date().toISOString(),
      };

      setState((prev) => {
        const newPapers = [newPaper, ...prev.papers];
        const updatedProjects = prev.projects.map((p) =>
          p.id === paperData.projectId
            ? { ...p, papersCount: newPapers.filter((pa) => pa.projectId === p.id).length }
            : p
        );
        return {
          ...prev,
          papers: newPapers,
          projects: updatedProjects,
        };
      });

      return newPaper;
    },
    [state.currentUser]
  );

  const deletePaper = useCallback((paperId: string) => {
    setState((prev) => {
      const target = prev.papers.find((p) => p.id === paperId);
      const filtered = prev.papers.filter((p) => p.id !== paperId);
      const updatedProjects = prev.projects.map((p) =>
        target && p.id === target.projectId
          ? { ...p, papersCount: filtered.filter((pa) => pa.projectId === p.id).length }
          : p
      );
      return {
        ...prev,
        papers: filtered,
        projects: updatedProjects,
      };
    });
  }, []);

  // Notice Board: Add Notice or To-Do
  const addNotice = useCallback(
    (title: string, content: string, type: "notice" | "todo", dueDate?: string) => {
      const newNotice: NoticeItem = {
        id: generateId("notc"),
        teamId: state.currentTeam?.id || "team_default",
        title,
        content,
        type,
        authorId: state.currentUser?.id || "anon",
        authorName: state.currentUser?.name || "Researcher",
        authorAvatar:
          state.currentUser?.avatar || "https://api.dicebear.com/7.x/shapes/svg?seed=notice",
        isCompleted: false,
        dueDate,
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        notices: [newNotice, ...prev.notices],
      }));

      return newNotice;
    },
    [state.currentTeam, state.currentUser]
  );

  const toggleNotice = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notices: prev.notices.map((n) =>
        n.id === id ? { ...n, isCompleted: !n.isCompleted } : n
      ),
    }));
  }, []);

  const deleteNotice = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notices: prev.notices.filter((n) => n.id !== id),
    }));
  }, []);

  const setActiveProject = useCallback((projectId: string | null) => {
    setState((prev) => ({ ...prev, activeProjectId: projectId }));
  }, []);

  return {
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
  };
}
