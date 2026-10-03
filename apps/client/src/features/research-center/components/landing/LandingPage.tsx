import React from "react";
import researchLogo from "@/assets/research/0x7-research-logo.png";
import gateBackgroundVideo from "@/assets/research/0x7-gate-background.mp4";
import { useGateScroll } from "../../hooks/useGateScroll";

interface LandingPageProps {
  onOpenAuth: (mode?: "select_role" | "login") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth }) => {
  const { videoOpacity } = useGateScroll();

  return (
    <div className="relative min-h-screen w-full bg-[#E5E7EB] text-[#0F172A] overflow-x-hidden selection:bg-[#CBD5E1]">
      {/* Background Gate Video (Grayscale desaturated) */}
      <div className="rc-gate-video-container pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="rc-gate-video"
          style={{ opacity: videoOpacity }}
        >
          <source src={gateBackgroundVideo} type="video/mp4" />
        </video>
        {/* Soft pearl gray gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#E5E7EB]/70 via-[#E5E7EB]/85 to-[#E5E7EB]" />
      </div>

      {/* Header Bar */}
      <header className="rc-content-layer mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={researchLogo}
            alt="0x7 Research Logo"
            className="w-10 h-10 object-contain rounded-lg border border-slate-300/40 shadow-sm"
          />
          <div>
            <div className="rc-mono text-lg font-bold tracking-tight text-[#0F172A]">
              0x7
            </div>
            <div className="text-xs uppercase tracking-wider text-[#475569] font-medium">
              Research Center
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenAuth("login")}
            className="px-4 py-2 text-sm font-medium text-[#475569] hover:text-[#0F172A] transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth("select_role")}
            className="rc-btn-primary px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer"
          >
            Join Workspace
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="rc-content-layer mx-auto max-w-5xl px-6 pt-20 pb-28 text-center flex flex-col items-center">
        {/* Academic Principle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-slate-300/30 text-xs font-medium text-[#475569] mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
          Rigorous Collaboration for 4-Person Academic Teams
        </div>

        {/* Welcome Tagline */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-[#0F172A] leading-tight sm:leading-snug max-w-3xl">
          Welcome to Our{" "}
          <span className="rc-mono font-extrabold underline decoration-slate-400/40 underline-offset-8">
            0x7
          </span>{" "}
          Research Club
        </h1>

        {/* Principle Quote */}
        <blockquote className="mt-6 text-lg sm:text-xl font-normal italic text-[#475569] max-w-2xl leading-relaxed">
          &ldquo;A space for four minds to think together, question freely, and build quietly.&rdquo;
        </blockquote>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={() => onOpenAuth("select_role")}
            className="rc-btn-primary px-8 py-3.5 rounded-2xl text-base font-semibold shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2 whitespace-nowrap"
          >
            <span>Select Your Role</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <button
            onClick={() => onOpenAuth("login")}
            className="rc-btn-secondary px-6 py-3.5 rounded-2xl text-base font-medium cursor-pointer whitespace-nowrap"
          >
            Sign In with Student ID
          </button>
        </div>

        {/* Quick Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="rc-glass-panel p-6">
            <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              01 / ISOLATION & INTEGRITY
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">
              4-Person Team Quarantine
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Strict isolation to guarantee high-velocity, low-noise academic collaboration.
            </p>
          </div>

          <div className="rc-glass-panel p-6">
            <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              02 / THOUGHT SANCTUARY
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">
              TipTap Private Drafts
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Draft private thoughts with auto-saving localStorage backup before publishing to team feed.
            </p>
          </div>

          <div className="rc-glass-panel p-6">
            <div className="rc-mono text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              03 / COLLABORATIVE VELOCITY
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">
              Dynamic 5-Phase Roadmap
            </h3>
            <p className="text-sm text-[#475569] leading-relaxed">
              Track progress through rigorous milestones with auto-calculated velocity metrics.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Creator Credit */}
      <footer className="rc-content-layer border-t border-slate-300/40 bg-white/40 backdrop-blur-md py-6 text-center text-sm text-[#475569]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="rc-mono font-bold text-[#0F172A]">0x7 Research Center</span>
            <span>&bull;</span>
            <span>Academic Research Workspace</span>
          </div>
          <div>
            Built with rigor by{" "}
            <a
              href="https://github.com/sabbir-ahmed-al-amin"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0F172A] hover:underline decoration-slate-400"
            >
              Sabbir Ahmed
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
