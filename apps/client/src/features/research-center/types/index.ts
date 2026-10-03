export type Role = "leader" | "member";

export interface UserProfile {
  id: string;
  name: string;
  studentId: string; // 4-character ID
  email: string;
  role: Role;
  avatar: string;
  teamId?: string;
  teamName?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  studentId: string;
  email: string;
  role: Role;
  avatar: string;
  notesCount: number;
  papersCount: number;
  tasksCount: number;
  contributionShare: number; // percentage (0-100)
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  referralCode: string;
  members: TeamMember[];
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  progress: number; // calculated percentage (0-100)
  status: "planning" | "in_progress" | "review" | "completed";
  memberIds: string[]; // max 4
  createdAt: string;
  notesCount: number;
  papersCount: number;
}

export interface Note {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  title: string;
  bodyHtml: string;
  preview: string;
  tags: string[];
  paperId?: string;
  paperTitle?: string;
  isPublished: boolean; // false = private draft, true = published to team
  createdAt: string;
  updatedAt: string;
}

export interface Paper {
  id: string;
  projectId: string;
  title: string;
  authors: string;
  year: number;
  journalOrConference: string;
  url: string;
  fileUrl?: string;
  fileName?: string;
  abstract: string;
  addedBy: string;
  addedByName: string;
  addedAt: string;
  tags: string[];
}

export interface RoadmapTask {
  id: string;
  phaseId: string;
  title: string;
  isCompleted: boolean;
  assignedMemberId?: string;
  assignedMemberName?: string;
  dueDate?: string;
}

export interface RoadmapPhase {
  id: string;
  projectId: string;
  title: string;
  order: number;
  startDate?: string;
  endDate?: string;
  tasks: RoadmapTask[];
}

export interface NoticeItem {
  id: string;
  teamId: string;
  title: string;
  content: string;
  type: "notice" | "todo";
  authorId: string;
  authorName: string;
  authorAvatar: string;
  isCompleted: boolean;
  dueDate?: string;
  createdAt: string;
}

export type WorkspaceTab =
  | "progression"
  | "notes"
  | "published"
  | "papers"
  | "roadmap"
  | "members";
