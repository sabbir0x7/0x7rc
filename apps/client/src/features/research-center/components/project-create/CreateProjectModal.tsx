import React, { useState } from "react";
import { TeamMember } from "../../types";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  currentUserId: string;
  onCreateProject: (title: string, description: string, memberIds: string[]) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  teamMembers,
  currentUserId,
  onCreateProject,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([currentUserId]);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleMember = (memberId: string) => {
    if (selectedMemberIds.includes(memberId)) {
      // Must have at least 1 member
      if (selectedMemberIds.length === 1) return;
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== memberId));
    } else {
      if (selectedMemberIds.length >= 4) {
        setError("A research project is strictly limited to 4 members.");
        return;
      }
      setError("");
      setSelectedMemberIds([...selectedMemberIds, memberId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a project title.");
      return;
    }
    onCreateProject(title.trim(), description.trim(), selectedMemberIds);
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rc-glass-panel relative w-full max-w-lg p-7 bg-white/90 backdrop-blur-2xl border border-slate-300/40 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            Project Genesis
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Initiate Research Project</h2>
          <p className="text-xs text-[#475569] mt-1">
            Setup an isolated workspace with a 5-phase academic roadmap.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Project Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Graph Neural Networks for Protein Folding"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rc-glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Abstract / Scope Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of the hypothesis, target venue, or goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rc-glass-input w-full px-3.5 py-2 text-xs resize-none"
            />
          </div>

          {/* Member Assignment (Max 4) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#0F172A]">
                Assigned Team Members
              </label>
              <span className="rc-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300/60">
                {selectedMemberIds.length}/4 Max
              </span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto rc-custom-scrollbar pr-1">
              {teamMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? "bg-slate-100/90 border-slate-400 font-semibold"
                        : "bg-white/60 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300"
                      />
                      <span className="text-[#0F172A]">{member.name}</span>
                      <span className="rc-mono text-[10px] text-slate-500 font-normal">
                        ({member.studentId})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <span className="text-emerald-700 font-bold">&check; Assigned</span>
                      ) : (
                        <span className="text-slate-400">+ Add</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rc-btn-primary px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
            >
              Initialize Project &amp; Roadmap
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
