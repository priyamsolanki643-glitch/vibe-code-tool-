"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Check, X, AlertTriangle, Cpu, Layers } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

type PathType = "Alpha" | "Beta" | null;

export default function PathSelection() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [selectedPath, setSelectedPath] = useState<PathType>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  
  // Dynamic strategy variables loaded from localStorage
  const [pathAlpha, setPathAlpha] = useState<any>(null);
  const [pathBeta, setPathBeta] = useState<any>(null);
  const [ambitionAssessment, setAmbitionAssessment] = useState<any>(null);
  const [showCommitmentCheck, setShowCommitmentCheck] = useState(false);
  const [acceptedOption, setAcceptedOption] = useState<"A" | "B" | null>(null);

  useEffect(() => {
    setIsClient(true);
    try {
      const cached = localStorage.getItem("architectResult");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.pathPresentation) {
          setPathAlpha(parsed.pathPresentation.pathAlpha);
          setPathBeta(parsed.pathPresentation.pathBeta);
        }
        if (parsed.ambitionAssessment) {
          setAmbitionAssessment(parsed.ambitionAssessment);
        }
      }
    } catch (e) {
      console.error("Failed to load architectResult from localStorage:", e);
    }
  }, []);

  const handleSelectPath = (type: PathType) => {
    setSelectedPath(type);
    
    // Check if selecting Alpha and it requires extreme commitment
    if (type === "Alpha" && ambitionAssessment?.egoReframeRequired) {
      setShowCommitmentCheck(true);
      setAcceptedOption(null);
      setIsConfirmed(false);
    } else {
      setShowCommitmentCheck(false);
    }
  };

  const lockTrajectory = async () => {
    if (isLocking) return;
    
    // If commitment check is required and not agreed to Option A
    if (selectedPath === "Alpha" && ambitionAssessment?.egoReframeRequired) {
      if (acceptedOption !== "A" || !isConfirmed) {
        alert("Bhai, you must select Option A and check the commitment promise to lock this path!");
        return;
      }
    } else {
      if (!isConfirmed) return;
    }

    setIsLocking(true);
    try {
      const targetPath = selectedPath === "Alpha" ? pathAlpha : pathBeta;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const payload = {
        missionName: targetPath?.opportunityUsed || (selectedPath === "Alpha" ? "Asymmetric Upside Strategy" : "Compounding Strategy"),
        lockedPath: selectedPath?.toLowerCase() || "beta",
        probabilityLow: targetPath?.probabilityRangeLow || (selectedPath === "Alpha" ? 18.4 : 74.2),
        probabilityHigh: targetPath?.probabilityRangeHigh || (selectedPath === "Alpha" ? 24.0 : 82.5),
        totalDays: (targetPath?.timelineMonths || 3) * 30,
        mindsetBrief: targetPath?.firstStepToday || "Start executing immediate discovery steps.",
        strategyContent: targetPath?.description || "Compounding action vector.",
        chatThreadId: `thread-locked-${selectedPath?.toLowerCase()}-${Date.now()}`
      };
      
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${baseUrl}/api/v1/interaction/lock-trajectory`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
"Authorization": `Bearer ${session?.access_token}`

        },
        body: JSON.stringify(payload)
      });
      await res.json();
      
      router.push("/");
    } catch (e) {
      console.error("Locking trajectory error:", e);
      router.push("/");
    } finally {
      setIsLocking(false);
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-[#52525b]">
        Loading decision matrix...
      </div>
    );
  }

  // Fallbacks if backend did not generate one (redundancy)
  const displayAlpha = pathAlpha || {
    opportunityUsed: "Localized No-Code SME Integration",
    description: "Build localized no-code integration systems for regional SMEs. Outsource complex modules, focus entirely on high-frequency B2B sales loops.",
    probabilityRangeLow: 18.4,
    probabilityRangeHigh: 24.0,
    requiredSacrifices: ["4h+ daily cognitive lock", "Pure B2B outbound cold sales", "Extreme rejection capacity"],
    keyRisks: ["Burnout from compounded rejection before reaching cashflow convergence."]
  };

  const displayBeta = pathBeta || {
    opportunityUsed: "Predictable SaaS Freelance Writing",
    description: "Targeted freelance technical writing for Series A SaaS startups. Secure 3 recurring retainer clients, then scale via templates and distribution networks.",
    probabilityRangeLow: 74.2,
    probabilityRangeHigh: 82.5,
    requiredSacrifices: ["2h+ daily execution lock", "Technical communication alpha", "Strict template adherence"],
    keyRisks: ["Boredom leading to execution failure before core structural compounding occurs."]
  };

  return (
    <main className="flex flex-col lg:flex-row min-h-screen w-full relative bg-black overflow-y-auto font-sans text-white">
      
      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/5 blur-[120px] mix-blend-screen" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.01]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* PATH ALPHA (Left) */}
      <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-white/5 p-6 md:p-12 flex flex-col justify-between relative z-10 overflow-y-auto no-scrollbar">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-amber-500 border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded">
              PATH 01
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#71717a]">
              HIGH-YIELD TRAJECTORY
            </span>
          </div>

          <div>
            <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-white mb-3">
              Path Alpha: {displayAlpha.opportunityUsed}
            </h2>
            <p className="text-[14px] text-[#a1a1aa] leading-relaxed">
              {displayAlpha.description}
            </p>
          </div>
          
          {/* Probability dial widget */}
          <div className="flex items-center gap-4 border border-white/5 bg-white/[0.01] rounded-2xl p-4 max-w-md">
            <div className="relative size-14 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray={`${displayAlpha.probabilityRangeLow}, 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-amber-500">{displayAlpha.probabilityRangeLow}%</span>
            </div>
            <div>
              <div className="text-[9px] font-mono text-[#71717a] uppercase tracking-wider">Convergence Probability</div>
              <div className="text-[12px] text-[#e4e4e7] leading-snug font-mono">
                {displayAlpha.probabilityRangeLow}%–{displayAlpha.probabilityRangeHigh}% target success index
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="border border-white/5 bg-white/[0.01] p-3 rounded-xl">
              <h3 className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Requires</h3>
              <ul className="space-y-1 text-[11px] text-[#a1a1aa] leading-snug list-none">
                {displayAlpha.requiredSacrifices?.map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1"><span className="text-amber-500 select-none">•</span> {s}</li>
                )) || <li>Execution Bandwidth</li>}
              </ul>
            </div>
            
            <div className="border border-white/5 bg-white/[0.01] p-3 rounded-xl">
              <h3 className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Upsides</h3>
              <ul className="space-y-1 text-[11px] text-[#a1a1aa] leading-snug list-none">
                <li className="flex items-start gap-1"><span className="text-amber-500 select-none">•</span> Asymmetric leverage</li>
                <li className="flex items-start gap-1"><span className="text-amber-500 select-none">•</span> Direct path to target</li>
              </ul>
            </div>

            <div className="border border-white/5 bg-white/[0.01] p-3 rounded-xl">
              <h3 className="font-mono text-[10px] text-red-500/70 uppercase tracking-wider mb-1">Risk Factors</h3>
              <ul className="space-y-1 text-[11px] text-[#a1a1aa] leading-snug list-none">
                {displayAlpha.keyRisks?.slice(0, 2).map((r: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1"><span className="text-red-500 select-none">•</span> {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button 
          onClick={() => handleSelectPath("Alpha")}
          className="mt-8 w-full max-w-md py-3.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 font-semibold text-[13px] hover:bg-amber-500/10 hover:border-amber-500/40 transition-all duration-200 cursor-pointer text-center"
        >
          Select Alpha Trajectory
        </button>
      </div>

      {/* PATH BETA (Right) */}
      <div className="w-full lg:w-1/2 p-6 md:p-12 flex flex-col justify-between relative z-10 overflow-y-auto no-scrollbar">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-400 border border-cyan-400/20 bg-cyan-400/5 px-2 py-0.5 rounded">
              PATH 02
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#71717a]">
              PREDICTABLE COMPOUNDER
            </span>
          </div>

          <div>
            <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-white mb-3">
              Path Beta: {displayBeta.opportunityUsed}
            </h2>
            <p className="text-[14px] text-[#a1a1aa] leading-relaxed">
              {displayBeta.description}
            </p>
          </div>
          
          {/* Probability dial widget */}
          <div className="flex items-center gap-4 border border-white/5 bg-white/[0.01] rounded-2xl p-4 max-w-md">
            <div className="relative size-14 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray={`${displayBeta.probabilityRangeLow}, 100`} strokeLinecap="round" />
              </svg>
              <span className="absolute text-[10px] font-mono font-bold text-cyan-400">{displayBeta.probabilityRangeLow}%</span>
            </div>
            <div>
              <div className="text-[9px] font-mono text-[#71717a] uppercase tracking-wider">Convergence Probability</div>
              <div className="text-[12px] text-[#e4e4e7] leading-snug font-mono">
                {displayBeta.probabilityRangeLow}%–{displayBeta.probabilityRangeHigh}% target success index
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="border border-white/5 bg-white/[0.01] p-3 rounded-xl">
              <h3 className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Requires</h3>
              <ul className="space-y-1 text-[11px] text-[#a1a1aa] leading-snug list-none">
                {displayBeta.requiredSacrifices?.map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1"><span className="text-cyan-400 select-none">•</span> {s}</li>
                )) || <li>Baseline metrics</li>}
              </ul>
            </div>
            
            <div className="border border-white/5 bg-white/[0.01] p-3 rounded-xl">
              <h3 className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider mb-1">Upsides</h3>
              <ul className="space-y-1 text-[11px] text-[#a1a1aa] leading-snug list-none">
                <li className="flex items-start gap-1"><span className="text-cyan-400 select-none">•</span> Compounding stability</li>
                <li className="flex items-start gap-1"><span className="text-cyan-400 select-none">•</span> Immediate validation index</li>
              </ul>
            </div>

            <div className="border border-white/5 bg-white/[0.01] p-3 rounded-xl">
              <h3 className="font-mono text-[10px] text-red-500/70 uppercase tracking-wider mb-1">Risk Factors</h3>
              <ul className="space-y-1 text-[11px] text-[#a1a1aa] leading-snug list-none">
                {displayBeta.keyRisks?.slice(0, 2).map((r: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1"><span className="text-red-500 select-none">•</span> {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <button 
          onClick={() => handleSelectPath("Beta")}
          className="mt-8 w-full max-w-md py-3.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-400 font-semibold text-[13px] hover:bg-cyan-400/10 hover:border-cyan-400/40 transition-all duration-200 cursor-pointer text-center"
        >
          Select Beta Trajectory
        </button>
      </div>

      {/* COMMITMENT CHECK OVERLAY MODAL */}
      {showCommitmentCheck && selectedPath === "Alpha" && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-3xl flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full border border-white/10 bg-[#09090b] rounded-3xl p-6 md:p-8 shadow-[0_25px_80px_-10px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto">
            
            <div className="size-10 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center mb-4">
              <ShieldAlert className="size-5 text-amber-500 animate-pulse" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase">
              Extreme Goal Commitment Check
            </h2>
            
            <div className="text-[13px] text-[#a1a1aa] leading-relaxed mb-6 space-y-3 whitespace-pre-line border-l-2 border-amber-500/30 pl-4 py-1">
              {ambitionAssessment?.reframeMessage || "This is a low-probability, extreme-variance path."}
            </div>

            {/* Options selectors inside commitment reframe */}
            <div className="space-y-3 mb-6">
              
              {/* Option A Card */}
              <div 
                onClick={() => setAcceptedOption("A")}
                className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                  acceptedOption === "A" 
                    ? "border-amber-500/50 bg-amber-500/[0.03]" 
                    : "border-white/5 bg-transparent hover:border-white/10"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white text-xs font-semibold uppercase font-mono">[Option A] The Extreme Path</span>
                  <div className={`size-4 rounded-full border flex items-center justify-center ${
                    acceptedOption === "A" ? "border-amber-500 bg-amber-500" : "border-white/20"
                  }`}>
                    {acceptedOption === "A" && <div className="size-2 rounded-full bg-black" />}
                  </div>
                </div>
                <p className="text-[11px] text-[#71717a] leading-relaxed">
                  Lock this extreme target. Proceed with Sprint 0: First-Rupee velocity outreach. No results guaranteed. High execution demands.
                </p>
              </div>

              {/* Option B Card */}
              <div 
                onClick={() => {
                  setAcceptedOption("B");
                  setSelectedPath("Beta");
                  setShowCommitmentCheck(false);
                }}
                className={`border rounded-2xl p-4 cursor-pointer transition-all ${
                  acceptedOption === "B" 
                    ? "border-cyan-500/50 bg-cyan-500/[0.03]" 
                    : "border-white/5 bg-transparent hover:border-white/10"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white text-xs font-semibold uppercase font-mono">[Option B] The Compounding Path</span>
                  <div className={`size-4 rounded-full border flex items-center justify-center ${
                    acceptedOption === "B" ? "border-cyan-500 bg-cyan-500" : "border-white/20"
                  }`}>
                    {acceptedOption === "B" && <div className="size-2 rounded-full bg-black" />}
                  </div>
                </div>
                <p className="text-[11px] text-[#71717a] leading-relaxed">
                  Pivot to the compounding path (40-60% chance of success) to secure your baseline. Defer extreme target to Phase 3.
                </p>
              </div>

            </div>

            {/* Checkbox confirmation */}
            {acceptedOption === "A" && (
              <div 
                onClick={() => setIsConfirmed(!isConfirmed)}
                className="flex items-start gap-3 mb-6 bg-white/[0.01] border border-white/5 rounded-2xl p-3.5 cursor-pointer select-none hover:border-white/10 transition-colors"
              >
                <div 
                  className={`size-5 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                    isConfirmed 
                      ? "bg-amber-500 border-amber-500 text-black" 
                      : "border-[#3f3f46] bg-transparent"
                  }`}
                >
                  {isConfirmed && <Check className="size-3.5 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-[12px] font-semibold text-white block">
                    I promise to persist & execute without quitting
                  </span>
                  <span className="text-[10px] text-[#52525b] mt-0.5 block">
                    I accept that motivation fluctuates and only raw work counts.
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                onClick={lockTrajectory}
                disabled={acceptedOption !== "A" || !isConfirmed || isLocking}
                className="flex-1 py-3 rounded-full font-semibold text-[13px] bg-white text-black hover:bg-gray-200 transition-colors disabled:bg-white/5 disabled:text-white/20 cursor-pointer disabled:cursor-not-allowed text-center"
              >
                {isLocking ? "Locking Trajectory..." : "Commit and Lock Trajectory"}
              </button>
              
              <button 
                onClick={() => {
                  setSelectedPath(null);
                  setShowCommitmentCheck(false);
                  setIsConfirmed(false);
                }}
                disabled={isLocking}
                className="px-5 py-3 rounded-full font-semibold text-[13px] border border-white/10 bg-transparent text-[#a1a1aa] hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REGULAR DIRECT LOCK CONFIRMATION MODAL (For Beta or non-extreme goals) */}
      {!showCommitmentCheck && selectedPath && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="relative max-w-xl w-full border border-white/10 bg-[#09090b] rounded-3xl p-6 md:p-8 shadow-[0_25px_80px_-10px_rgba(0,0,0,0.85)]">
            
            <div className="size-10 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center mb-4">
              <Check className="size-5 text-cyan-400" />
            </div>
            
            <h2 className="text-xl font-bold tracking-tight text-white mb-2 uppercase">
              Commit Path {selectedPath === "Alpha" ? "Alpha" : "Beta"} Trajectory?
            </h2>
            
            <p className="text-[13px] text-[#a1a1aa] leading-relaxed mb-6">
              You are locking the compounding trajectory. The strategy engine will compile daily objectives committed strictly to this vector. Subsequent requests to modify direction without verified structural life shifts will be rejected. You accept that motivation fluctuations are not grounds for recalibration.
            </p>

            {/* Checkbox Toggle */}
            <div 
              onClick={() => setIsConfirmed(!isConfirmed)}
              className="flex items-start gap-3 mb-6 bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 cursor-pointer select-none hover:border-white/10 transition-colors"
            >
              <div 
                className={`size-5 rounded border flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                  isConfirmed 
                    ? "bg-white border-white text-black" 
                    : "border-[#3f3f46] bg-transparent"
                }`}
              >
                {isConfirmed && <Check className="size-3.5 stroke-[3]" />}
              </div>
              <div>
                <span className="text-[12px] font-semibold text-white block">
                  I accept and understand what I am locking
                </span>
                <span className="text-[10px] text-[#52525b] mt-0.5 block">
                  This action is logged as immutable in the ledger.
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={lockTrajectory}
                disabled={!isConfirmed || isLocking}
                className="flex-1 py-3.5 rounded-full font-semibold text-[13px] bg-white text-black hover:bg-gray-200 transition-colors disabled:bg-white/5 disabled:text-white/20 cursor-pointer disabled:cursor-not-allowed text-center"
              >
                {isLocking ? "Locking Trajectory..." : "Lock Trajectory"}
              </button>
              
              <button 
                onClick={() => {
                  setSelectedPath(null);
                  setIsConfirmed(false);
                }}
                disabled={isLocking}
                className="px-5 py-3.5 rounded-full font-semibold text-[13px] border border-white/10 bg-transparent text-[#a1a1aa] hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
