import React from "react";
import { Role } from "../../types";

interface AccountTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: Role) => void;
  onOpenLogin: () => void;
}

export const AccountTypeModal: React.FC<AccountTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  onOpenLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rc-glass-panel relative w-full max-w-xl p-8 bg-white/80 backdrop-blur-2xl border border-slate-300/40 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            0x7 Access Portal
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Choose Your Role</h2>
          <p className="text-sm text-[#475569] mt-1.5">
            Select how you would like to participate in the research workspace
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Leader Card */}
          <button
            onClick={() => onSelectRole("leader")}
            className="rc-glass-card group text-left p-6 flex flex-col justify-between border border-slate-300/40 hover:border-slate-400 bg-white/60 hover:bg-white/90 transition-all rounded-2xl cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A] mb-4 border border-slate-200 group-hover:bg-[#0F172A] group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#0F172A] mb-1">Research Lead</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Found a new 4-member research team, configure milestones, and generate team referral codes.
              </p>
            </div>
            <div className="mt-5 text-xs font-semibold text-[#0F172A] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Create Team</span>
              <span>&rarr;</span>
            </div>
          </button>

          {/* Member Card */}
          <button
            onClick={() => onSelectRole("member")}
            className="rc-glass-card group text-left p-6 flex flex-col justify-between border border-slate-300/40 hover:border-slate-400 bg-white/60 hover:bg-white/90 transition-all rounded-2xl cursor-pointer"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[#0F172A] mb-4 border border-slate-200 group-hover:bg-[#0F172A] group-hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-[#0F172A] mb-1">Team Member</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Join your lead&apos;s 4-person workspace using the 8-character invitation referral code.
              </p>
            </div>
            <div className="mt-5 text-xs font-semibold text-[#0F172A] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span>Join with Code</span>
              <span>&rarr;</span>
            </div>
          </button>
        </div>

        {/* Footer Alternative */}
        <div className="mt-8 text-center border-t border-slate-300/40 pt-5">
          <button
            onClick={onOpenLogin}
            className="text-xs font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
          >
            Already registered in 0x7? <span className="font-semibold underline">Sign In with Student ID</span>
          </button>
        </div>
      </div>
    </div>
  );
};
