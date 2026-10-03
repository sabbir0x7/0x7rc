import React from "react";
import { Project, Note, Paper } from "../../types";

interface SummaryMetricsProps {
  projects: Project[];
  notes: Note[];
  papers: Paper[];
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  projects,
  notes,
  papers,
}) => {
  const activeProjectsCount = projects.length;
  const notesCount = notes.length;
  const publishedCount = notes.filter((n) => n.isPublished).length;
  const papersCount = papers.length;

  const avgProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((acc, curr) => acc + (curr.progress || 0), 0) / projects.length
        )
      : 0;

  const metrics = [
    {
      label: "Active Projects",
      value: activeProjectsCount,
      subtext: `${projects.filter((p) => p.status === "in_progress").length} in progress`,
    },
    {
      label: "Private Notes",
      value: notesCount,
      subtext: `${publishedCount} published to team`,
    },
    {
      label: "Papers Collected",
      value: papersCount,
      subtext: "Shared PDF repository",
    },
    {
      label: "Roadmap Progress",
      value: `${avgProgress}%`,
      subtext: "Across active milestones",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((item, idx) => (
        <div
          key={idx}
          className="rc-glass-panel p-4 sm:p-5 flex flex-col justify-between"
        >
          <div className="text-xs font-medium text-[#475569]">{item.label}</div>
          <div className="rc-mono text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-2 mb-1">
            {item.value}
          </div>
          <div className="text-[11px] text-slate-500">{item.subtext}</div>
        </div>
      ))}
    </div>
  );
};
