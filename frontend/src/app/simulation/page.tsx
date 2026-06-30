"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Cpu, Terminal, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

const SIMULATION_STEPS = [
  "Mapping local opportunity signals for Kanpur, India...",
  "Applying capability constraints: Technical Velocity — MODERATE | Communication Alpha — 0.61...",
  "Running trajectory simulations across verified market vectors...",
  "Stress-testing paths against shock variables: infrastructure failure, market saturation, platform shifts...",
  "Calculating probability distributions...",
  "Identifying highest-viability trajectories..."
];

export default function SimulationSequence() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  useEffect(() => {
    const triggerArchitectCall = async () => {
      try {
        const cached = localStorage.getItem("diagnosticResult");
        if (!cached) {
          setIsApiLoaded(true);
          return;
        }
        const diagnosticResult = JSON.parse(cached);
const { data: { session } } = await supabase.auth.getSession();
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

        const res = await fetch(`${baseUrl}/api/v1/interaction/architect`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
"Authorization": `Bearer ${session?.access_token}`

          },
          body: JSON.stringify({
            contextMatrix: diagnosticResult.contextMatrix,
            capabilityVector: diagnosticResult.capabilityVector,
            survivabilityAudit: diagnosticResult.survivabilityAudit,
            frictionProfile: diagnosticResult.frictionProfile
          })
        });
        const data = await res.json();
        if (data?.data) {
          localStorage.setItem("architectResult", JSON.stringify(data.data));
        }
      } catch (err) {
        console.error("Architect simulation API call failed:", err);
      } finally {
        setIsApiLoaded(true);
      }
    };

    triggerArchitectCall();
  }, []);

  useEffect(() => {
    // Reveal steps one by one to simulate 8-second computation
    const stepDuration = 8080 / SIMULATION_STEPS.length;
    
    if (activeStep < SIMULATION_STEPS.length) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, stepDuration);
      return () => clearTimeout(timer);
    } else if (isApiLoaded) {
      const completeTimer = setTimeout(() => {
        setIsComplete(true);
        setTimeout(() => {
          router.push("/selection");
        }, 1500);
      }, 500);
      return () => clearTimeout(completeTimer);
    }
  }, [activeStep, isApiLoaded, router]);

  // Calculate percentage for progress loader
  const progressPercent = Math.min((activeStep / SIMULATION_STEPS.length) * 100, 100);

  return (
    <main className="flex h-screen w-full items-center justify-center bg-black p-4 md:p-8 relative overflow-hidden font-mono text-white" style={{ height: '100dvh' }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-950/10 blur-[130px] mix-blend-screen" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="w-full max-w-3xl relative z-10">
        
        {/* Diagnostic HUD Container */}
        <div className="border border-white/5 bg-[#09090b]/80 backdrop-blur-2xl rounded-2xl p-6 md:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center shrink-0">
                <Cpu className="size-4 text-cyan-400 animate-pulse" />
              </div>
              <div>
                <h2 className="text-[12px] font-semibold tracking-wider text-white uppercase">
                  SIMULATION ENGINE // ACTIVE CORE
                </h2>
                <div className="text-[9px] text-[#71717a] mt-0.5 uppercase tracking-widest flex items-center gap-1.5">
                  CORE_LOAD: 98.4% <span className="text-cyan-400/30">|</span> THREADS: 128 ACTIVE
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 border border-white/5 bg-white/[0.02] px-3 py-1 rounded-md">
              {!isComplete ? (
                <>
                  <Loader2 className="size-3 text-cyan-400 animate-spin" />
                  <span className="text-[9px] text-cyan-400 tracking-wider">COMPUTING</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3 text-white/80" />
                  <span className="text-[9px] text-white/80 tracking-wider">COMPLETE</span>
                </>
              )}
            </div>
          </div>

          {/* Loader bar */}
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-8">
            <div 
              className="h-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)] transition-all duration-500 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step Sequence */}
          <div className="space-y-3.5 min-h-[220px] flex flex-col justify-start">
            {SIMULATION_STEPS.map((step, idx) => {
              const isActive = activeStep === idx + 1;
              const isRevealed = activeStep > idx;

              // Generate static timestamps for console diagnostic look
              const stepTime = (idx * (8 / SIMULATION_STEPS.length)).toFixed(2);

              return (
                <div key={idx} className="flex items-start gap-4">
                  <span className={`text-[11px] font-mono select-none shrink-0 ${isRevealed ? "text-[#71717a]" : "text-[#27272a]"}`}>
                    [{stepTime}s]
                  </span>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isRevealed ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex-1 text-[13px] leading-relaxed select-text ${
                      isActive 
                        ? "text-cyan-400 font-semibold" 
                        : isRevealed 
                        ? "text-[#a1a1aa]" 
                        : "text-[#27272a]"
                    }`}
                  >
                    <span>{step}</span>
                    {isActive && !isComplete && (
                      <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="ml-1 inline-block w-1.5 h-4 bg-cyan-400 align-middle shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                      />
                    )}
                  </motion.div>
                </div>
              );
            })}

            {/* Complete take-over */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="pt-6 border-t border-white/5 flex items-center gap-3 text-white/80 text-[14px] font-semibold"
              >
                <CheckCircle2 className="size-4.5 text-white/80 shrink-0" />
                <span>Simulation complete. 2 viable trajectories identified.</span>
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-1.5 h-4 bg-white align-middle"
                />
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
