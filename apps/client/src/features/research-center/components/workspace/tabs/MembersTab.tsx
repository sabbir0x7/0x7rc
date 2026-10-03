import React, { useState } from "react";
import { TeamMember, Team } from "../../../types";

interface MembersTabProps {
  members: TeamMember[];
  team: Team | null;
}

export const MembersTab: React.FC<MembersTabProps> = ({ members, team }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (team?.referralCode) {
      navigator.clipboard.writeText(team.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-300/40">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">
            Research Unit Contributors ({members.length}/4)
          </h3>
          <p className="text-xs text-[#475569]">
            Dedicated 4-person academic team. Work is distributed and attributed symmetrically.
          </p>
        </div>

        {team?.referralCode && members.length < 4 && (
          <div className="flex items-center gap-2 bg-white/70 p-1.5 px-3 rounded-xl border border-slate-300">
            <span className="text-[11px] text-slate-500 font-medium">Invite Code:</span>
            <span className="rc-mono text-xs font-bold text-slate-900">
              {team.referralCode}
            </span>
            <button
              onClick={copyCode}
              className="text-[10px] font-semibold text-slate-700 hover:text-black underline ml-1"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      {/* 4 Member Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {members.map((member) => (
          <div
            key={member.id}
            className="rc-glass-panel p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-11 h-11 rounded-full border-2 border-white shadow-sm bg-slate-200"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A]">
                      {member.name}
                    </h4>
                    <div className="rc-mono text-xs text-slate-500">
                      ID: {member.studentId}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    member.role === "leader"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {member.role === "leader" ? "Team Lead" : "Researcher"}
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 my-4 text-center">
                <div className="p-2 rounded-lg bg-white/60 border border-slate-200">
                  <div className="rc-mono text-base font-bold text-[#0F172A]">
                    {member.notesCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Notes
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/60 border border-slate-200">
                  <div className="rc-mono text-base font-bold text-[#0F172A]">
                    {member.papersCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Papers
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/60 border border-slate-200">
                  <div className="rc-mono text-base font-bold text-[#0F172A]">
                    {member.tasksCount}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Tasks
                  </div>
                </div>
              </div>
            </div>

            {/* Contribution Share Bar */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 text-[11px]">
                  Effort Allocation
                </span>
                <span className="rc-mono font-bold text-[#0F172A]">
                  {member.contributionShare}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full transition-all duration-500"
                  style={{ width: `${member.contributionShare}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
