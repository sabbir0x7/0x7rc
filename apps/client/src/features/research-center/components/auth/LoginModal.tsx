import React, { useState } from "react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  login: (studentId: string, password: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToRegister,
  login,
}) => {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = studentId.trim();
    if (cleanId.length !== 4) {
      setError("Student ID must be strictly 4 alphanumeric characters (e.g. '0x7A').");
      return;
    }
    if (!password) {
      setError("Please enter your academic password.");
      return;
    }
    setError("");
    login(cleanId, password);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rc-glass-panel relative w-full max-w-md p-8 bg-white/85 backdrop-blur-2xl border border-slate-300/40 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
            0x7 Security Check
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A]">Sign In to Workspace</h2>
          <p className="text-xs text-[#475569] mt-1">
            Access your 4-person research team dashboard
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1 flex items-center justify-between">
              <span>Student ID *</span>
              <span className="text-[10px] text-slate-400 font-normal">Strictly 4 chars</span>
            </label>
            <input
              type="text"
              required
              maxLength={4}
              placeholder="e.g. 0X7A"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              className="rc-glass-input w-full px-3.5 py-2.5 text-sm rc-mono uppercase tracking-widest font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rc-glass-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="rc-btn-primary w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </form>

        <div className="mt-6 text-center border-t border-slate-300/40 pt-4">
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-xs font-medium text-[#475569] hover:text-[#0F172A]"
          >
            Don&apos;t have an account? <span className="font-semibold underline">Register new team</span>
          </button>
        </div>
      </div>
    </div>
  );
};
