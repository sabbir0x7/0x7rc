import React, { useState } from "react";
import { Role } from "../../types";

interface RegistrationModalProps {
  isOpen: boolean;
  role: Role;
  onClose: () => void;
  onSuccess: (result: any) => void;
  onBackToRoles: () => void;
  registerLeader: (teamName: string, leaderName: string, studentId: string, email: string) => any;
  registerMember: (referralCode: string, memberName: string, studentId: string, email: string) => any;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  role,
  onClose,
  onSuccess,
  onBackToRoles,
  registerLeader,
  registerMember,
}) => {
  const [step, setStep] = useState<"form" | "otp" | "referral_result">("form");

  // Form Fields
  const [teamName, setTeamName] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [referralCode, setReferralCode] = useState("");

  // OTP simulation
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [validationError, setValidationError] = useState("");

  // Result state
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // Validation: Student ID must be strictly 4 alphanumeric characters
  const validateForm = () => {
    setValidationError("");
    if (!fullName.trim()) {
      setValidationError("Full name is required.");
      return false;
    }
    const cleanId = studentId.trim();
    if (cleanId.length !== 4) {
      setValidationError("Student ID must be strictly 4 alphanumeric characters (e.g. '0x7A' or 'CS42').");
      return false;
    }
    if (role === "leader" && !teamName.trim()) {
      setValidationError("Team name is required for research leads.");
      return false;
    }
    if (role === "member" && !referralCode.trim()) {
      setValidationError("An 8-character referral code is required to join a team.");
      return false;
    }
    return true;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setStep("otp");
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[0];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = () => {
    const fullCode = otp.join("");
    if (fullCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit verification code.");
      return;
    }
    setOtpError("");

    if (role === "leader") {
      const res = registerLeader(teamName, fullName, studentId, email);
      setCreatedResult(res);
      setStep("referral_result");
    } else {
      const res = registerMember(referralCode, fullName, studentId, email);
      onSuccess(res);
    }
  };

  const copyReferralCode = () => {
    if (createdResult?.team?.referralCode) {
      navigator.clipboard.writeText(createdResult.team.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="rc-glass-panel relative w-full max-w-lg p-8 bg-white/85 backdrop-blur-2xl border border-slate-300/40 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* STEP 1: REGISTRATION FORM */}
        {step === "form" && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={onBackToRoles}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                <span>&larr;</span> <span>Back</span>
              </button>
              <span className="text-slate-300">|</span>
              <span className="rc-mono text-xs font-semibold uppercase text-slate-500">
                {role === "leader" ? "Team Leader Registration" : "Member Enrollment"}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-[#0F172A]">
              {role === "leader" ? "Establish Research Team" : "Join Research Group"}
            </h2>
            <p className="text-xs text-[#475569] mt-1 mb-6">
              {role === "leader"
                ? "You will lead a strict 4-person academic unit."
                : "Enter your team lead's 8-character referral code."}
            </p>

            {validationError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {validationError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {role === "leader" ? (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Research Team Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cognitive Systems Lab"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="rc-glass-input w-full px-3.5 py-2.5 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Team Referral Code (8 Characters) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0X7-A9F4"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="rc-glass-input w-full px-3.5 py-2.5 text-sm rc-mono uppercase tracking-wider"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Full Legal / Academic Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rc-glass-input w-full px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    Academic Email
                  </label>
                  <input
                    type="email"
                    placeholder="student@univ.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rc-glass-input w-full px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="rc-btn-primary w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Send OTP Verification Code
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: SIMULATED OTP VERIFICATION */}
        {step === "otp" && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-[#0F172A]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-[#0F172A]">Verify Student Identity</h3>
            <p className="text-xs text-[#475569] mt-1 mb-6 max-w-sm mx-auto">
              We sent a simulated 6-digit authorization code for Student ID{" "}
              <span className="rc-mono font-bold text-[#0F172A]">{studentId}</span>. (Enter &apos;123456&apos; or any 6 digits).
            </p>

            {otpError && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {otpError}
              </div>
            )}

            {/* 6 Digit Inputs */}
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="rc-glass-input w-11 h-12 text-center text-lg font-bold rc-mono border-slate-300"
                />
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleVerifyOtp}
                className="rc-btn-primary w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Verify &amp; Confirm Registration
              </button>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Cancel and edit info
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LEADER REFERRAL CODE GENERATED */}
        {step === "referral_result" && createdResult && (
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-[#0F172A]">Team Established!</h3>
            <p className="text-xs text-[#475569] mt-1 mb-6">
              Share this 8-character referral code with up to 3 researchers to complete your 4-person team.
            </p>

            {/* Generated Code Box */}
            <div className="rc-glass-card p-6 bg-slate-100/80 border border-slate-300/60 rounded-2xl mb-6">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Team Referral Code
              </div>
              <div className="rc-mono text-3xl font-extrabold text-[#0F172A] tracking-wider mb-3">
                {createdResult.team?.referralCode}
              </div>
              <button
                type="button"
                onClick={copyReferralCode}
                className="rc-btn-secondary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                {copiedCode ? (
                  <>
                    <span className="text-emerald-600 font-bold">&check; Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSuccess(createdResult)}
              className="rc-btn-primary w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Enter Empty Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
