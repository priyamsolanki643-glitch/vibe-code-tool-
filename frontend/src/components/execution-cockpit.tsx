"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/utils/supabase/client";
import { 
  Layers, Check, X, 
  CornerDownLeft, AlertTriangle, RefreshCw 
} from "lucide-react";
import { ParticleSphere } from "@/components/particle-sphere";


interface Task {
  id: string;
  title: string;
  description: string;
  metricBound: string;
  timeAllocationHours: number;
  isCompleted: boolean;
}

interface ActiveMission {
  missionName: string;
  lockedPath: string;
  dayNumber: number;
  totalDays: number;
  consistencyScore: number;
  streakDays: number;
  mindsetBrief: string;
  strategyContent: string;
  debtDays?: number;
  daysToGoal?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "fp";
  text: string;
}

export function ExecutionCockpit() {
  const router = useRouter();
  
  // Mission states
  const [mission, setMission] = useState<ActiveMission | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Chat states
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Failure modal state
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureExplanation, setFailureExplanation] = useState("");
  const [failedTaskId, setFailedTaskId] = useState<string | null>(null);

  // Load mission and tasks on mount
  useEffect(() => {
    fetchActiveMission();
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    let channel: any;
    let supabaseClient: any;
    const setupRealtime = async () => {
      try {
        const { supabase } = await import('@/utils/supabase/client');
        supabaseClient = supabase;
        const { data: { session } } = await supabase.auth.getSession();
        
        let userId = session?.user?.id;
        if (!userId) {
          const anonId = localStorage.getItem('fp_anon_id');
          if (anonId) userId = `anon_${anonId}`;
        }
        
        if (!userId) return;
        
        channel = supabase.channel('cockpit-realtime-updates')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'missions', filter: `user_id=eq.${userId}` },
            (payload) => {
              console.log('Realtime Cockpit Update received:', payload);
              if (payload.new) {
                setMission(payload.new as ActiveMission);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Failed to setup realtime subscription:', err);
      }
    };
    setupRealtime();
    return () => {
      if (channel && supabaseClient) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  async function fetchActiveMission() {
    setLoading(true);
    try {
const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/v1/interaction/active-mission`, {
        headers: { "Authorization": `Bearer ${session?.access_token}` }

      });
      const result = await res.json();
      
      if (result?.data) {
        setMission(result.data);
        await fetchCurrentTasks(result.data);
      } else {
        // No active mission -> send user back to landing/intake
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to load active mission details:", err);
      setLoading(false);
    }
  };

  async function fetchCurrentTasks(activeMission: ActiveMission) {
    try {
      const cachedDiag = localStorage.getItem("diagnosticResult");
      if (!cachedDiag) {
        setLoading(false);
        return;
      }
      const diagData = JSON.parse(cachedDiag);
const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

      
      const res = await fetch(`${baseUrl}/api/v1/interaction/operator/current-tasks`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
"Authorization": `Bearer ${session?.access_token}`

        },
        body: JSON.stringify({
          dayNumber: activeMission.dayNumber,
          matrix: diagData.contextMatrix,
          capabilityVector: diagData.capabilityVector,
          frictionProfile: diagData.frictionProfile,
          strategyState: {
            status: "locked",
            lockedPath: { opportunityUsed: activeMission.missionName },
            currentDayNumber: activeMission.dayNumber,
            totalTargetDays: activeMission.totalDays,
            consistencyScore: activeMission.consistencyScore,
            currentStreak: activeMission.streakDays
          }
        })
      });
      const result = await res.json();
      
      if (result?.data?.tasks) {
        setTasks(result.data.tasks);
      }
    } catch (err) {
      console.error("Failed to fetch daily task sprint:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogTask = async (taskId: string, outcome: "completed" | "failed", explanation?: string) => {
    setActionLoading(true);
    try {
      const cachedDiag = localStorage.getItem("diagnosticResult");
      if (!cachedDiag || !mission) return;
      
      const diagData = JSON.parse(cachedDiag);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

      const payload = {
        input: {
          userRuntime: {
            contextMatrix: diagData.contextMatrix,
            capabilityVector: diagData.capabilityVector,
            frictionProfile: diagData.frictionProfile,
            availablePaths: [],
            strategyState: {
              status: "locked",
              lockedPath: { opportunityUsed: mission.missionName },
              currentDayNumber: mission.dayNumber,
              totalTargetDays: mission.totalDays,
              consistencyScore: mission.consistencyScore,
              currentStreak: mission.streakDays,
              consecutiveFailureCount: mission.streakDays === 0 ? 1 : 0
            },
            consistencyHistory: [],
            currentTaskSprint: { tasks }
          },
          taskId,
          outcome,
          failureExplanation: explanation || ""
        },
        matrix: diagData.contextMatrix,
        capabilityVector: diagData.capabilityVector,
        frictionProfile: diagData.frictionProfile
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${baseUrl}/api/v1/interaction/operator/task`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
"Authorization": `Bearer ${session?.access_token}`

        },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result?.data) {
        const updatedRuntime = result.data.updatedRuntime;
        
        // Update local diagnostic cache with potentially recalibrated capability vector
        diagData.capabilityVector = updatedRuntime.capabilityVector;
        localStorage.setItem("diagnosticResult", JSON.stringify(diagData));

        // Append operator notification message to chat log
        const deltaText = result.data.consistencyEvent?.delta !== undefined 
          ? `[CONSISTENCY DELTA: ${result.data.consistencyEvent.delta > 0 ? "+" : ""}${result.data.consistencyEvent.delta} pts]`
          : "";
          
        const botMsg = `SYSTEM: Task update processed as [${outcome.toUpperCase()}]. ${deltaText}\n${result.data.consistencyEvent?.reason || ""}\n${
          result.data.recalibrationOccurred ? "⚠ RECALIBRATION: Consecutive failures detected. Down-regulating true capability index (V_c) by 15%." : ""
        }`;

        setMessages(prev => [...prev, { id: String(Date.now()), role: "fp", text: botMsg }]);

        // Refetch active mission & tasks to sync day, streaks, consistency score
        await fetchActiveMission();
      }
    } catch (err) {
      console.error("Error updating task status:", err);
    } finally {
      setActionLoading(false);
      setShowFailureModal(false);
      setFailureExplanation("");
      setFailedTaskId(null);
    }
  };

    const handleSendChatMessage = async (overrideText?: string) => {
    const text = (overrideText || chatInput).trim();
    if (!text || isThinking || !mission) return;

    setMessages(prev => [...prev, { id: String(Date.now()), role: "user", text }]);
    if (!overrideText) setChatInput("");
    setIsThinking(true);
    setIsStreaming(true);

    try {
      const cachedDiag = localStorage.getItem("diagnosticResult");
      if (!cachedDiag) return;
      const diagData = JSON.parse(cachedDiag);
      
      const historyPayload = messages.map(m => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: m.text }]
      }));
      historyPayload.push({ role: "user", parts: [{ text }] });

      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

      const res = await fetch(`${baseUrl}/api/v1/interaction/message/stream`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: historyPayload,
          state_context: {
            contextMatrix: diagData.contextMatrix,
            capabilityVector: diagData.capabilityVector,
            frictionProfile: diagData.frictionProfile,
            availablePaths: [],
            strategyState: {
              status: "locked",
              isLocked: true,
              lockedPath: { opportunityUsed: mission.missionName },
              currentDayNumber: mission.dayNumber,
              totalTargetDays: mission.totalDays,
              consistencyScore: mission.consistencyScore,
              currentStreak: mission.streakDays
            },
            currentTaskSprint: { tasks },
            consistencyHistory: []
          }
        })
      });

      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      const aiMsgId = String(Date.now() + 1);
      setMessages(prev => [...prev, { id: aiMsgId, role: "fp", text: "" }]);
      setIsThinking(false);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;
              try {
                const eventData = JSON.parse(dataStr);
                if (eventData.type === "text" || eventData.type === "disclaimer") {
                  setMessages(prev => {
                    const newArr = [...prev];
                    const lastIdx = newArr.length - 1;
                    if (lastIdx >= 0 && newArr[lastIdx].role === "fp") {
                      newArr[lastIdx] = { ...newArr[lastIdx], text: newArr[lastIdx].text + eventData.text };
                    }
                    return newArr;
                  });
                } else if (eventData.type === "metadata" && eventData.data?.engine_result?.data?.updatedRuntime) {
                  await fetchActiveMission();
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: String(Date.now()), role: "fp", text: "Connection offline. Strategy operator unavailable." }]);
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
    }
  };

const handleRecalibrate = () => {
    if (confirm("Are you sure you want to end session and force full parameter recalibration? This imposes consistency debt penalties.")) {
      localStorage.removeItem("architectResult");
      localStorage.removeItem("diagnosticResult");
      // Trigger API reset or redirect back to intake
      window.location.href = "/intake";
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-mono text-cyan-400" style={{ height: '100dvh' }}>
        <RefreshCw className="size-8 animate-spin mb-4" />
        <span>BOOTING TACTICAL COCKPIT PROTOCOL...</span>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-mono text-[#a1a1aa] p-6 text-center" style={{ height: '100dvh' }}>
        <AlertTriangle className="size-10 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">NO ACTIVE LOCKED TRAJECTORY</h2>
        <p className="max-w-md text-sm mb-6 leading-relaxed">
          You must set up your circumstantial matrix and decide on a strategy before unlocking execution protocol.
        </p>
        <button 
          onClick={() => router.push("/intake")}
          className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-xs uppercase tracking-wider"
        >
          Initialize Onboarding
        </button>
      </div>
    );
  }

  // Get color for runway band
  const bandColor = mission.lockedPath === "alpha" ? "amber" : "cyan";
  const displayScore = mission.consistencyScore === -1 ? 0 : mission.consistencyScore;
  const consistencyColorClass = displayScore >= 75 ? "text-white/80" : displayScore >= 50 ? "text-amber-400" : "text-red-400";
  const consistencyProgressColor = displayScore >= 75 ? "#ffffff" : displayScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-screen bg-[#000000] text-white font-sans overflow-hidden relative" style={{ height: '100dvh' }}>
      
      {/* Background glowing gradients */}
      <div className="pointer-events-none absolute top-10 left-10 w-[400px] h-[400px] rounded-full bg-indigo-950/10 blur-[120px] z-0" />
      <div className="pointer-events-none absolute bottom-10 right-10 w-[400px] h-[400px] rounded-full bg-purple-950/10 blur-[120px] z-0" />

      {/* God Level Ambient Particle Field */}
      <div className="fixed inset-0 z-0 pointer-events-none mix-blend-screen opacity-30">
        <ParticleSphere />
      </div>

      {/* LEFT COLUMN: Cockpit Control Center */}
      <div className="w-full lg:w-[62%] h-full border-r border-[#151515] flex flex-col justify-between p-4 md:p-6 lg:p-8 overflow-y-auto no-scrollbar relative z-10">
        
        {/* Cockpit HUD Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                mission.lockedPath === "alpha" 
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-500" 
                  : "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"
              }`}>
                {mission.lockedPath === "alpha" ? "ALPHA PATH // ASYMMETRIC" : "BETA PATH // COMPOUNDING"}
              </span>
              <span className="font-mono text-[9px] text-[#71717a]">DAY {mission.dayNumber} OF {mission.totalDays}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white select-text">
              {mission.missionName}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-[#71717a] uppercase">RUNWAY:</span>
            <div className="flex items-center gap-1.5 bg-white/[0.02] px-3.5 py-1.5 rounded-full">
              <div className={`size-2 rounded-full ${mission.lockedPath === "alpha" ? "bg-amber-500" : "bg-cyan-400"}`} />
              <span className="font-mono text-[10px] text-white font-semibold">
                {mission.daysToGoal || (mission.totalDays - mission.dayNumber)} DAYS LEFT
              </span>
            </div>
          </div>
        </div>

        {/* HUD Content Grid */}
        <div className="flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Consistency circular display */}
            <div className="bg-white/[0.01] rounded-2xl p-5 flex flex-col items-center justify-center backdrop-blur-md">
              <span className="font-mono text-[9px] text-[#71717a] uppercase tracking-wider mb-4">Consistency Index</span>
              <div className="relative size-24">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="6" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="44" 
                    fill="none" 
                    stroke={consistencyProgressColor} 
                    strokeWidth="6" 
                    strokeDasharray="276" 
                    strokeDashoffset={276 - (276 * displayScore) / 100} 
                    strokeLinecap="round" 
                    style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{mission.consistencyScore === -1 ? '?' : displayScore}</span>
                  <span className="text-[8px] font-mono text-[#52525b]">/100</span>
                </div>
              </div>
            </div>

            {/* Streaks Widget */}
            <div className="bg-white/[0.01] rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md">
              <div>
                <span className="font-mono text-[9px] text-[#71717a] uppercase tracking-wider block mb-1">Consistency Streak</span>
                <span className="text-4xl font-bold text-white leading-none">
                  {mission.streakDays}
                </span>
                <span className="text-xs font-mono text-[#71717a] ml-1">DAYS CONSECUTIVE</span>
              </div>
              <p className="text-[11px] text-[#71717a] leading-relaxed mt-2">
                Log consecutive completions to lock in capability metrics and scale output complexity.
              </p>
            </div>

            {/* Run-time Ideologies */}
            <div className="bg-white/[0.01] rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md">
              <div>
                <span className="font-mono text-[9px] text-[#71717a] uppercase tracking-wider block mb-2">Active Logic Runtimes</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#a1a1aa] text-xs">
                    <div className="size-1.5 rounded-full bg-white" />
                    <span>Parkinson&apos;s Compression</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#a1a1aa] text-xs">
                    <div className="size-1.5 rounded-full bg-white" />
                    <span>First-Principles Logic</span>
                  </div>
                </div>
              </div>
              <div className="text-[9px] font-mono text-[#52525b] uppercase tracking-widest mt-4">
                Adaptive checks active
              </div>
            </div>

          </div>

          {/* Daily Tasks Section */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-2">
              <span className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider">
                [02] Daily Execution Sprints
              </span>
              <span className="font-mono text-[9px] text-[#52525b]">PARKINSON COMPRESSED TIMELINE</span>
            </div>

            <div className="space-y-4">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={` bg-white/[0.01] rounded-2xl p-5 backdrop-blur-md transition-all duration-300 ${
                      task.isCompleted ? "opacity-45 scale-[0.99]" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <h3 className={`text-base font-semibold text-white ${task.isCompleted ? "line-through text-[#71717a]" : ""}`}>
                          {task.title}
                        </h3>
                        <p className="text-[13px] text-[#a1a1aa] leading-relaxed mt-1">
                          {task.description}
                        </p>
                      </div>
                      
                      <span className="font-mono text-[9px] text-[#71717a] bg-white/[0.02] px-2 py-0.5 rounded shrink-0">
                        {task.timeAllocationHours}H LIMIT
                      </span>
                    </div>

                    <div className="/[0.03] pt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="text-[11px] font-mono text-[#71717a] uppercase select-text">
                        <span className="text-[#a1a1aa]">Done Metric:</span> {task.metricBound}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!task.isCompleted ? (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleLogTask(task.id, "completed")}
                              className="px-4 py-1.5 rounded-full bg-white text-black hover:bg-gray-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Check className="size-3.5" /> Log Completion
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => {
                                setFailedTaskId(task.id);
                                setShowFailureModal(true);
                              }}
                              className="px-4 py-1.5 rounded-full border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <X className="size-3.5" /> Declare Failure
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-mono text-white/80 flex items-center gap-1">
                            <Check className="size-3.5" /> Task sprint complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border-dashed rounded-2xl p-8 text-center text-[#71717a] font-mono text-xs">
                  Sprints completed for today. Recalculating matrix logs for next day inflow...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HUD Footer Controls */}
        <div className="mt-8 pt-4 shrink-0 flex items-center justify-between">
          <button 
            onClick={() => handleSendChatMessage(`Verify ledger status for: ${mission.missionName}. Current metrics logged as day ${mission.dayNumber}.`)}
            className="font-mono text-[10px] text-[#71717a] hover:text-white transition-colors cursor-pointer"
          >
            {"// VERIFY LEDGER STATUS"}
          </button>
          
          <button
            onClick={handleRecalibrate}
            className="font-mono text-[10px] text-red-500/60 hover:text-red-400 transition-colors cursor-pointer"
          >
            {"// END SESSION & FORCE RECALIBRATION"}
          </button>
        </div>

      </div>

      {/* RIGHT COLUMN: Critique Console terminal */}
      <div className="w-full lg:w-[38%] h-full bg-[#050505] flex flex-col justify-between overflow-hidden relative">
        {/* Terminal Header */}
        <div className="px-6 py-4 border-b border-[#151515] flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#ffffff] animate-pulse" />
            <span className="font-mono text-[10px] text-[#71717a] uppercase tracking-wider">
              fp@operator:~$ critique --stream
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#52525b]">CRITIQUE TERMINAL v1.2</span>
        </div>

        {/* Monospaced Chat logs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
              <Layers className="size-8 text-[#27272a] mb-3" />
              <p className="font-mono text-[12px] text-[#52525b] max-w-[240px] leading-relaxed">
                Terminal operational. Ask strategic questions, discuss execution bottlenecks, or log progress conversationally.
              </p>
            </div>
          ) : (
            <div className="space-y-6 font-mono text-[13px] leading-relaxed">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div key={m.id} className="space-y-1 select-text">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold ${isUser ? "text-cyan-400" : "text-[#ffffff]"}`}>
                        {isUser ? "fp@user:~$" : "fp@operator:~$"}
                      </span>
                      <span className="text-[9px] text-[#52525b]">
                        {new Date(parseInt(m.id)).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className={`pl-4 whitespace-pre-wrap ${isUser ? "text-white" : "text-[#a1a1aa] "} ${!isUser && isStreaming && m.id === messages[messages.length - 1]?.id ? "liquid-streaming-text" : ""}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              
              {isThinking && (
                <div className="flex items-center gap-2 text-[#ffffff]">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="text-[10px] text-[#52525b] uppercase ml-1 animate-pulse">Running critique evaluation...</span>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Monospaced Input field */}
        <div className="p-4 border-t border-[#151515] bg-[#030303] shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChatMessage();
            }}
            className="flex items-center gap-3 bg-black rounded-xl px-4 py-3 focus-within: transition-all duration-200"
          >
            <span className="font-mono text-[12px] text-[#ffffff] select-none">fp@operator:~$</span>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask operator anything..."
              className="flex-1 bg-transparent border-none outline-none text-white font-mono text-[13px] placeholder:text-[#3f3f46]"
            />
            <button 
              type="submit" 
              className="size-7 rounded-lg bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
            >
              <CornerDownLeft className="size-3.5" />
            </button>
          </form>
        </div>

      </div>

      {/* FAILURE DECLARATION DIALOG OVERLAY */}
      {showFailureModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#09090b] rounded-3xl p-6 md:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.85)] font-sans">
            
            <div className="size-10 rounded-xl border-red-500/20 bg-red-500/5 flex items-center justify-center mb-4">
              <AlertTriangle className="size-5 text-red-400" />
            </div>

            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
              Failure Audit Parameter Log
            </h3>
            
            <p className="text-[13px] text-[#a1a1aa] leading-relaxed mb-6">
              You are declaring task failure. The engine collects parameter explanation to analyze local bottlenecks, identify procrastination triggers, and adjust future task sizes. Be specific: why did this fail?
            </p>

            <textarea
              value={failureExplanation}
              onChange={(e) => setFailureExplanation(e.target.value)}
              placeholder="e.g. Time bottleneck, missing technical capability, distraction loop..."
              rows={3}
              className="w-full bg-[#050505] rounded-2xl px-4 py-3 text-[13px] font-mono text-white placeholder:text-[#3f3f46] outline-none focus: transition-colors mb-6 no-scrollbar"
            />

            <div className="flex gap-3">
              <button
                disabled={actionLoading || !failureExplanation.trim()}
                onClick={() => failedTaskId && handleLogTask(failedTaskId, "failed", failureExplanation)}
                className="flex-1 py-3 rounded-full font-semibold text-[13px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:bg-white/5 disabled:text-white/20 cursor-pointer disabled:cursor-not-allowed text-center"
              >
                Log Failure State
              </button>
              
              <button
                disabled={actionLoading}
                onClick={() => {
                  setShowFailureModal(false);
                  setFailureExplanation("");
                  setFailedTaskId(null);
                }}
                className="px-5 py-3 rounded-full font-semibold text-[13px] bg-transparent text-[#a1a1aa] hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
