"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, X, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

interface FocusModeProps {
  isOpen: boolean;
  onClose: (distracted: boolean) => void;
  taskTitle: string;
}

export function FocusMode({ isOpen, onClose, taskTitle }: FocusModeProps) {
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes
  const [isActive, setIsActive] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [isWarned, setIsWarned] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Distraction tracking (Visibility change)
  useEffect(() => {
    if (!isOpen || !isActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings((prev) => prev + 1);
        setIsWarned(true);
        setTimeout(() => setIsWarned(false), 3000);

        if (warnings >= 2) {
          // Break the streak
          setIsActive(false);
          onClose(true); // true = distracted
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isOpen, isActive, warnings, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#09090b] text-white overflow-hidden"
      >
        {/* Dynamic Mesh Background Effect */}
        <div className="absolute inset-0 z-0 opacity-30">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-emerald-900/30 blur-[120px] rounded-full" />
            <div className="absolute top-1/4 left-1/3 w-[40vw] h-[40vw] bg-blue-900/20 blur-[100px] rounded-full mix-blend-screen" />
        </div>

        {/* Warning Flash */}
        <AnimatePresence>
          {isWarned && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-600/20 z-10 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="absolute top-8 flex items-center gap-3 text-red-500 font-mono text-sm tracking-widest uppercase z-20">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          Anti-Distraction Engine Active
        </div>

        <div className="text-center max-w-lg px-6 z-20">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-12"
          >
            <h2 className="text-xl text-zinc-400 font-medium mb-4">Current Sprint:</h2>
            <p className="text-3xl font-bold text-white tracking-tight">{taskTitle || "Deep Execution Phase"}</p>
          </motion.div>

          <div className="relative flex justify-center items-center mb-16">
            <svg className="absolute w-[300px] h-[300px] -rotate-90">
              <circle
                cx="150"
                cy="150"
                r="140"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="4"
                fill="none"
              />
              <motion.circle
                cx="150"
                cy="150"
                r="140"
                stroke={warnings > 0 ? "#ef4444" : "#10b981"}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                initial={{ strokeDasharray: "880", strokeDashoffset: "880" }}
                animate={{ strokeDashoffset: 880 - (880 * timeLeft) / (90 * 60) }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </svg>
            <div className="text-7xl font-mono tracking-tighter text-white z-10 font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </div>
          </div>

          {warnings > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 justify-center text-red-500 mb-8 font-mono text-sm bg-red-500/10 py-2 px-4 rounded-full border border-red-500/20"
            >
              <AlertTriangle className="w-4 h-4" />
              Focus break detected ({warnings}/3). Next break cancels session.
            </motion.div>
          )}

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isActive ? "PAUSE" : "START SPRINT"}
            </button>
            <button
              onClick={() => {
                if (isActive) setWarnings(prev => prev + 1);
                onClose(true);
              }}
              className="flex items-center gap-2 px-6 py-4 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
              ABORT
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
