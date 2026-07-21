"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { ParticleSphere } from "@/components/particle-sphere";
import { MagneticButton } from "@/components/magnetic-button";

interface LandingPageProps {
  onLock: () => void;
  hasSession: boolean;
  onAnonymous?: () => void;
}

export function LandingPage({ onLock, hasSession, onAnonymous }: LandingPageProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  useEffect(() => {
    // Elegant ultra-smooth fade in
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    if (hasSession) {
      if (!isExiting) {
        setIsExiting(true);
        setTimeout(onLock, 700); // Wait for exit animation
      }
    } else {
      if (onAnonymous && !isExiting) {
        setIsExiting(true);
        setTimeout(onAnonymous, 700);
      } else {
        setAuthMode("signup");
        setIsAuthOpen(true);
      }
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthOpen(false);
    if (!isExiting) {
      setIsExiting(true);
      setTimeout(onLock, 700);
    }
  };

  return (
    <div className="lp-root relative min-h-screen bg-[#000000] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* ── The Void: Micro-Grain ── */}
      <div 
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-overlay z-0"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}
      />

      {/* Standard React CSS Injector */}
      <style>{`
        .lp-root {
          background-color: #000000 !important;
        }

        /* White Glass Pill CTA */
        .btn-white-pill {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 16px 42px;
          border-radius: 9999px;
          background: #ffffff;
          color: #000000;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.01em;
          border: 1px solid #ffffff;
          box-shadow: 
            0 0 15px rgba(255, 255, 255, 0.5), /* Sharp inner glow */
            0 10px 40px rgba(255, 255, 255, 0.3), /* Wide ambient glow */
            inset 0 -2px 4px rgba(0, 0, 0, 0.1); /* Inner depth */
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
          z-index: 10;
        }

        .btn-white-pill:active {
          transform: scale(0.95);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.4), 0 5px 20px rgba(255, 255, 255, 0.2);
        }

        .btn-white-pill .arrow-icon {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          color: #000000;
        }
        .btn-white-pill:active .arrow-icon {
          transform: translateX(4px);
        }

        .btn-white-pill-sm {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 24px;
          border-radius: 9999px;
          background: #ffffff;
          color: #000000;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid #ffffff;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.4), 0 6px 20px rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-white-pill-sm:active {
          transform: scale(0.95);
        }

        /* Ghost Auth Buttons */
        .btn-ghost-auth {
          background: transparent;
          color: #888888;
          font-size: 14px;
          font-weight: 500;
          padding: 10px 16px;
          border-radius: 9999px;
          transition: color 0.3s ease, background 0.3s ease;
        }
        .btn-ghost-auth:active {
          color: #ffffff;
          background: rgba(255,255,255,0.05);
        }
        
        .god-text-shadow {
          text-shadow: 0 4px 24px rgba(255, 255, 255, 0.25);
        }

        .shimmer-text-lumensky {
          color: transparent;
          background: linear-gradient(90deg, #666 0%, #fff 40%, #fff 60%, #666 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer 2.5s linear infinite;
        }
        @keyframes shimmer {
          0%  { background-position: -200% 0; }
          to  { background-position:  200% 0; }
        }
      `}</style>

      {/* ── Header (Flow-based alignment) ── */}
      <header 
        className="flex items-center justify-end px-6 py-6 relative z-20 w-full transition-opacity duration-700"
        style={{ opacity: visible && !isExiting ? 1 : 0 }}
      >
        <div className="flex items-center gap-2 z-20">
          <button onClick={() => { setAuthMode("signup"); setIsAuthOpen(true); }} className="btn-ghost-auth">Sign up</button>
          <MagneticButton>
            <button onClick={() => { setAuthMode("login"); setIsAuthOpen(true); }} className="btn-white-pill-sm">Log in</button>
          </MagneticButton>
        </div>
      </header>

      {/* ── Hero Main Content ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10 max-w-4xl mx-auto w-full">
        
        {/* The 3D Canvas Particle Sphere */}
        <ParticleSphere />

        <div 
          className="flex flex-col items-center w-full relative z-10"
          style={{
            transition: "transform 1000ms cubic-bezier(0.16, 1, 0.3, 1), opacity 1000ms cubic-bezier(0.16, 1, 0.3, 1), filter 1000ms ease-out",
            opacity: isExiting ? 0 : (visible ? 1 : 0),
            transform: isExiting ? "scale(0.9) translateY(-40px)" : (visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)"),
            filter: visible && !isExiting ? "blur(0px)" : "blur(12px)",
            willChange: "transform, opacity, filter",
          }}
        >
          {/* Headline */}
          <h1 className="font-display mb-8 flex flex-col items-center pointer-events-none">
            {/* First Line */}
            <div 
              className="tracking-tight pb-1 text-[#a1a1aa] leading-[1.0]"
              style={{ fontSize: "clamp(2.0rem, 10vw, 5.0rem)", fontWeight: 400 }}
            >
              Stop planning.
            </div>
            
            {/* Second Line */}
            <div 
              className="tracking-tighter pb-2 leading-[1.1] whitespace-nowrap"
              style={{ fontSize: "clamp(2.8rem, 13vw, 7.2rem)", fontWeight: 500, marginTop: "-0.02em" }}
            >
              <span className="shimmer-text-lumensky god-text-shadow">
                Start executing.
              </span>
            </div>
          </h1>

          {/* Subtext */}
          <p className="text-[#a1a1aa] text-[15px] sm:text-[17px] leading-snug max-w-[90%] sm:max-w-md mx-auto mb-10 font-sans font-normal opacity-90 pointer-events-none">
            Built for achievers, not procrastinators.<br />
            <span className="text-white/70 font-medium">No fluff. No excuses. No mercy.</span>
          </p>

          {/* Centered CTA Row */}
          <div className="flex justify-center w-full relative z-20">
            <MagneticButton strength={30}>
              <button className="btn-white-pill group" onClick={handleStart}>
                <span>Get started</span>
                <ArrowRight size={20} className="arrow-icon" />
              </button>
            </MagneticButton>
          </div>
        </div>
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} onSuccess={handleAuthSuccess} initialMode={authMode} />}

      {/* ── Empty/Hidden Clean Footer ── */}
      <footer className="h-12 w-full" />
    </div>
  );
}
