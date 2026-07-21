"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Shield, Cpu, Activity, CornerDownLeft } from "lucide-react";
import { supabase } from "@/utils/supabase/client";

const INTAKE_QUESTIONS = [
  { key: "geo", text: "Where are you operating from? (City, Country)" },
  { key: "capital", text: "What is your current liquid capital available for this goal?" },
  { key: "hours", text: "How many hours of unbroken cognitive focus can you commit daily?" },
  { key: "ego", text: "Why does this matter? What is the actual leverage point driving you?" }
];

export default function IntakeTerminal() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [conversationHistory, setConversationHistory] = useState<{ role: "user" | "model", parts: { text: string }[] }[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState(INTAKE_QUESTIONS[0].text);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing, currentIndex]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, currentQuestionText, isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isProcessing || isLocked) return;

    const answer = inputValue;
    setInputValue("");
    const updatedHistoryItems = [...history, { q: currentQuestionText, a: answer }];
    setHistory(updatedHistoryItems);
    
    const newUserMsg = { role: "user" as const, parts: [{ text: answer }] };
    const updatedHistory = [...conversationHistory, newUserMsg];
    setConversationHistory(updatedHistory);
    
    setIsProcessing(true);
    
    try {
const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

      const res = await fetch(`${baseUrl}/api/v1/interaction/message`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
"Authorization": `Bearer ${session?.access_token}`

        },
        body: JSON.stringify({
          message: answer,
          conversationHistory: updatedHistory,
          action: "onboarding"
        })
      });
      const data = await res.json();
      const aiResponseText = data?.data?.ai_response?.response_text || INTAKE_QUESTIONS[currentIndex + 1]?.text || "Processing complete.";

      setConversationHistory(prev => [...prev, { role: "model" as const, parts: [{ text: aiResponseText }] }]);

      if (currentIndex < INTAKE_QUESTIONS.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setCurrentQuestionText(aiResponseText);
      } else {
        // Run full diagnostic engine based on collected inputs
        const geoAns = updatedHistoryItems[0]?.a || "Kanpur, India";
        const capitalAns = updatedHistoryItems[1]?.a || "10000";
        const hoursAns = updatedHistoryItems[2]?.a || "4";
        const goalAns = answer;

        const capitalVal = parseFloat(capitalAns.replace(/[^0-9.]/g, "")) || 10000;
        const hoursVal = parseFloat(hoursAns.replace(/[^0-9.]/g, "")) || 4;

        let geographyTier: 'tier1_city' | 'tier2_city' | 'tier3_city' = 'tier2_city';
        const geoLower = geoAns.toLowerCase();
        if (geoLower.match(/delhi|mumbai|bangalore|bengaluru|kolkata|chennai|hyderabad|pune/)) {
          geographyTier = 'tier1_city';
        } else if (geoLower.match(/kanpur|lucknow|jaipur|patna|indore|bhopal|nagpur|agra/)) {
          geographyTier = 'tier2_city';
        } else {
          geographyTier = 'tier3_city';
        }

        const diagnosticPayload = {
          geographyTier,
          country: geoLower.includes("india") ? "IN" : "US",
          region: geoAns,
          liquidCapital: capitalVal,
          monthlyBurnRate: Math.max(3000, Math.floor(capitalVal / 4)),
          hasDebt: false,
          debtMonthlyObligation: 0,
          familyDependencyScore: 1.0,
          rawSkillStrings: ["typescript", "react", "nextjs", "automation"],
          hasVerifiableOutputMap: { "typescript": true, "react": false },
          positiveCommSignals: ["clear", "responsive"],
          negativeCommSignals: [],
          dailyUninterruptedHours: hoursVal,
          deviceTier: "mid_range" as const,
          internetStability: "4g_stable" as const,
          workEnvironment: "dedicated_quiet" as const,
          canWorkAtNight: true,
          hasDedicatedWorkspace: true,
          procrastinationSignals: {
            tookLongBetweenAnswers: false,
            setOptimisticDeadlines: false,
            gavelVagueGoalsNotSpecific: false,
            mentionedPastFailedAttempts: false,
            usedPassiveLanguage: false,
            conflatedPlanningWithExecution: false
          },
          cognitiveEnduranceMinutes: 120,
          emotionalResilience: 0.8,
          baselineDiscipline: 0.7,
          preferredWorkStyle: "deep_work_clusters" as const,
          riskTolerance: 0.6,
          declaredGoal: goalAns,
          targetAmount: capitalVal * 2,
          currency: "INR" as const,
          timelineMonths: 3,
          sacrificesToleratedList: ["sleep", "leisure"],
          nonNegotiables: ["health"],
          pathPreference: "undecided" as const,
          onboardingText: `Goal: ${goalAns}. Capital: ${capitalAns}. Hours: ${hoursAns}. Geo: ${geoAns}`,
          detectedFrictionSignalIds: []
        };

        const { data: { session: diagSession } } = await supabase.auth.getSession();
        const diagRes = await fetch(`${baseUrl}/api/v1/interaction/diagnostic`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
"Authorization": `Bearer ${diagSession?.access_token}`

          },
          body: JSON.stringify(diagnosticPayload)
        });
        const diagData = await diagRes.json();
        
        if (diagData?.data) {
          localStorage.setItem("diagnosticResult", JSON.stringify(diagData.data));
        }

        setIsLocked(true);
        setTimeout(() => {
          router.push("/gate");
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      if (currentIndex < INTAKE_QUESTIONS.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setCurrentQuestionText(INTAKE_QUESTIONS[currentIndex + 1].text);
      } else {
        setIsLocked(true);
        setTimeout(() => router.push("/gate"), 2000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden relative font-sans text-white" style={{ height: '100dvh' }}>
      {/* Aurora Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: "12s" }} />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* LEFT 2/3: Interactive Terminal Area */}
      <div className="w-full lg:w-2/3 h-full flex flex-col p-4 md:p-8 lg:p-12 overflow-y-auto no-scrollbar relative z-10">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-6 rounded-full bg-white flex items-center justify-center">
              <span className="text-black text-[9px] font-bold">FP</span>
            </div>
            <span className="font-mono text-[10px] tracking-[0.25em] text-[#71717a] uppercase">
              OPERATOR // TERMINAL_INFLOW
            </span>
          </div>
          <div className="flex items-center gap-2 border border-white/5 bg-white/[0.02] px-3.5 py-1.5 rounded-full backdrop-blur-md">
            <div className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[9px] text-cyan-400 tracking-wider">CONNECTION SECURE</span>
          </div>
        </div>

        {/* Console Box */}
        <div className="flex-1 flex flex-col justify-end max-w-3xl w-full mx-auto">
          <div className="space-y-6 overflow-y-auto no-scrollbar pr-2 pb-4">
            <AnimatePresence>
              {history.map((item, idx) => (
                <motion.div 
                  key={idx} 
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-3"
                >
                  {/* System output */}
                  <div className="flex items-start gap-3">
                    <div className="size-5 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0 mt-0.5">
                      <Terminal className="size-3 text-[#71717a]" />
                    </div>
                    <p className="font-mono text-[13px] text-[#a1a1aa] leading-relaxed select-text">
                      {item.q}
                    </p>
                  </div>
                  
                  {/* User response */}
                  <div className="flex items-start gap-3 pl-8">
                    <span className="font-mono text-[13px] text-cyan-400">fp@operator:~$</span>
                    <p className="font-mono text-[13px] text-white leading-relaxed select-text bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                      {item.a}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Current Question Block */}
            {!isLocked && currentQuestionText && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-4 pt-2"
              >
                <div className="flex items-start gap-3">
                  <div className="size-6 rounded-md border border-white/15 bg-white/[0.04] flex items-center justify-center shrink-0 mt-1">
                    <Terminal className="size-3.5 text-white animate-pulse" />
                  </div>
                  <p className="font-sans text-xl md:text-2xl font-normal text-white leading-snug tracking-tight">
                    {currentQuestionText}
                  </p>
                </div>
                
                {/* Input Prompt */}
                {!isProcessing ? (
                  <div className="pl-9 pt-1">
                    <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 focus-within:border-white/15 transition-all duration-200 backdrop-blur-md">
                      <span className="font-mono text-[13px] text-cyan-400 select-none">fp@operator:~$</span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none text-[14px] font-mono text-white placeholder:text-[#3f3f46]"
                        placeholder="Enter parameter..."
                      />
                      <button type="submit" className="size-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer shrink-0">
                        <CornerDownLeft className="size-3.5" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="pl-9 h-12 flex items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <span className="thinking-dot text-cyan-400" />
                        <span className="thinking-dot text-cyan-400" />
                        <span className="thinking-dot text-cyan-400" />
                      </div>
                      <span className="font-mono text-[11px] text-cyan-400/80 tracking-wider uppercase">
                        Running constraints audit...
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Trajectory Locking Status */}
            {isLocked && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pl-9 pt-4 flex items-center gap-3"
              >
                <div className="size-6 rounded-full border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                  <Shield className="size-3.5 text-white/80 animate-pulse" />
                </div>
                <span className="font-mono text-xs text-white/80 uppercase tracking-widest animate-pulse">
                  REALITY PROFILE LOCKED // COMPILING DEVIATION VECTOR...
                </span>
              </motion.div>
            )}
            
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>

      {/* RIGHT 1/3: Constraint Matrix Panel */}
      <div className="hidden lg:flex w-1/3 h-full border-l border-white/5 bg-[#09090b]/80 backdrop-blur-xl p-12 flex-col justify-between relative z-10">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 mb-12">
            <Cpu className="size-4 text-[#71717a]" />
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#71717a]">
              Constraint Vector Matrix
            </h3>
          </div>

          {/* Slots / Progress Cards */}
          <div className="space-y-4">
            {INTAKE_QUESTIONS.map((q, idx) => {
              const isMapped = idx < currentIndex || isLocked;
              const isPending = idx === currentIndex && !isLocked;

              return (
                <div 
                  key={q.key} 
                  className={`border rounded-2xl p-5 transition-all duration-300 ${
                    isMapped 
                      ? "border-white/10 bg-white/[0.02] shadow-[0_4px_20px_rgba(0,0,0,0.2)]" 
                      : isPending 
                      ? "border-cyan-500/20 bg-cyan-500/[0.02] shadow-[0_0_24px_rgba(34,211,238,0.02)]" 
                      : "border-white/5 bg-transparent opacity-40"
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${isPending ? "text-cyan-400" : "text-[#71717a]"}`}>
                      0{idx + 1} // {q.key} vector
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {isMapped ? (
                        <div className="flex items-center gap-1.5">
                          <div className="size-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                          <span className="font-mono text-[9px] text-white/80 tracking-wider">MAPPED</span>
                        </div>
                      ) : isPending ? (
                        <div className="flex items-center gap-1.5">
                          <div className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span className="font-mono text-[9px] text-cyan-400 tracking-wider">PENDING</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="size-1.5 rounded-full bg-[#27272a]" />
                          <span className="font-mono text-[9px] text-[#52525b] tracking-wider">AWAITING</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className={`text-[13px] font-sans ${isMapped ? "text-white" : isPending ? "text-[#a1a1aa]" : "text-[#52525b]"}`}>
                    {isMapped ? "Data vector integrated into strategy engine." : isPending ? "Listening to parameters..." : "Awaiting matrix slot activation."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Widget */}
        <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-5 flex items-center gap-4">
          <div className="size-9 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-center shrink-0">
            <Activity className="size-4 text-cyan-400" />
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider mb-0.5">
              Processing Core
            </div>
            <div className="text-[12px] text-[#a1a1aa] leading-snug">
              Telemetry pipeline listening on port 8080.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
