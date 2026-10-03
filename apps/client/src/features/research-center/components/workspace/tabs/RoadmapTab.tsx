import React, { useState } from "react";
import { RoadmapPhase, Project } from "../../../types";

interface RoadmapTabProps {
  project: Project;
  phases: RoadmapPhase[];
  onToggleTask: (taskId: string) => void;
}

export const RoadmapTab: React.FC<RoadmapTabProps> = ({
  project,
  phases,
  onToggleTask,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-300/40">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">
            5-Phase Academic Roadmap
          </h3>
          <p className="text-xs text-[#475569]">
            Check off completed milestones to dynamically recalculate overall project progress ({project.progress}%).
          </p>
        </div>

        <div className="rc-mono text-xs font-extrabold px-3 py-1.5 rounded-xl bg-slate-900 text-white shadow-sm">
          Velocity: {project.progress}% Done
        </div>
      </div>

      {/* Phases Timeline */}
      <div className="space-y-4">
        {phases.map((phase) => {
          const totalTasks = phase.tasks.length;
          const completedTasks = phase.tasks.filter((t) => t.isCompleted).length;
          const isPhaseDone = totalTasks > 0 && totalTasks === completedTasks;

          return (
            <div
              key={phase.id}
              className={`rc-glass-panel p-5 transition-all ${
                isPhaseDone ? "bg-white/85 border-slate-400" : "bg-white/60"
              }`}
            >
              {/* Phase Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold rc-mono ${
                      isPhaseDone
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isPhaseDone ? "✓" : phase.order}
                  </span>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {phase.title}
                  </h4>
                </div>

                <span className="rc-mono text-xs text-slate-500 font-semibold">
                  {completedTasks}/{totalTasks}
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-2 pl-8">
                {phase.tasks.map((task) => (
                  <label
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      task.isCompleted
                        ? "bg-slate-100/80 border-slate-300 text-slate-500 line-through"
                        : "bg-white/70 border-slate-200/80 hover:bg-white text-[#0F172A]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => onToggleTask(task.id)}
                        className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-medium">{task.title}</span>
                    </div>

                    {task.assignedMemberName && (
                      <span className="text-[10px] text-slate-400">
                        {task.assignedMemberName}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
