import React from "react";
import { Project, RoadmapPhase } from "../../../types";

interface ProgressionGraphTabProps {
  project: Project;
  phases: RoadmapPhase[];
}

export const ProgressionGraphTab: React.FC<ProgressionGraphTabProps> = ({
  project,
  phases,
}) => {
  const allTasks = phases.flatMap((p) => p.tasks);
  const completedTasks = allTasks.filter((t) => t.isCompleted);
  const progressPercent = project.progress;

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Circular Gauge Card */}
        <div className="rc-glass-panel p-6 flex items-center justify-between">
          <div>
            <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Overall Completion
            </div>
            <div className="text-2xl font-bold text-[#0F172A]">
              {progressPercent}% Complete
            </div>
            <p className="text-xs text-[#475569] mt-1">
              {completedTasks.length} of {allTasks.length} milestones reached
            </p>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-slate-800 transition-all duration-700 ease-out"
                strokeDasharray={`${progressPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute rc-mono text-xs font-bold text-[#0F172A]">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Milestone Velocity */}
        <div className="rc-glass-panel p-6">
          <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Research Pace
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {progressPercent === 100 ? "Ready for Submission" : "Active Velocity"}
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Across 5 academic phases &bull; 4 active contributors
          </p>
        </div>

        {/* Target Stage */}
        <div className="rc-glass-panel p-6">
          <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Current Phase
          </div>
          <div className="text-base font-bold text-[#0F172A] truncate">
            {phases.find((p) => p.tasks.some((t) => !t.isCompleted))?.title ||
              "Phase 5: Manuscript Finalized"}
          </div>
          <p className="text-xs text-[#475569] mt-1">
            Next milestone review scheduled with 4-person team
          </p>
        </div>
      </div>

      {/* 5-Phase Horizontal Timeline Chart */}
      <div className="rc-glass-panel p-6">
        <h3 className="text-base font-bold text-[#0F172A] mb-4">
          5-Phase Academic Progression
        </h3>

        <div className="space-y-4">
          {phases.map((phase, idx) => {
            const phaseTasks = phase.tasks;
            const phaseDone = phaseTasks.filter((t) => t.isCompleted);
            const phasePct =
              phaseTasks.length > 0
                ? Math.round((phaseDone.length / phaseTasks.length) * 100)
                : 0;

            return (
              <div key={phase.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0F172A]">
                    {phase.title}
                  </span>
                  <span className="rc-mono font-bold text-slate-600">
                    {phaseDone.length}/{phaseTasks.length} ({phasePct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-800 transition-all duration-500 rounded-full"
                    style={{ width: `${phasePct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
