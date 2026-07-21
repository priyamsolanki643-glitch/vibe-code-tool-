"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Mic, Plus, Menu, Globe, Image, ThumbsUp, ThumbsDown, Share2, Copy, Target, Camera, Paperclip, X, ChevronRight, ChevronLeft, Cpu, Edit, RefreshCw, Check, Square, Atom, Zap, Fingerprint, Lock, Shield } from "lucide-react";
import { GyroLogo } from "./gyro-logo";
import { supabase } from "@/utils/supabase/client";
import { MarkdownRenderer } from "./markdown-renderer";
interface ChatViewProps {
  onOpenSidebar: () => void;
  isAnonymous?: boolean;
  onRequireAuth?: () => void;
}

interface Message {
  id: string;
  role: "user" | "fp";
  text: string;
  soul?: string;
  soulEmoji?: string;
  soulColor?: string;
  files?: { name: string; url: string; type: string }[];
  createdAt?: string;
}

// Utility for soul colors
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

export function ChatView({ onOpenSidebar, isAnonymous, onRequireAuth }: ChatViewProps) {
  const router = useRouter();
  const [simulationData, setSimulationData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSoul, setActiveSoul] = useState<{name: string, emoji: string, color: string} | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [greeting, setGreeting] = useState({ text: "Hi bro", accent: "What are we vibing on today?", animateAccent: true });
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    let text = "Good Evening";
    if (hour < 12) text = "Good Morning";
    else if (hour < 17) text = "Good Afternoon";
    setGreeting({ text, accent: "What are we vibing on today?", animateAccent: true });
  }, []);

  // Initialize anonymous id
  useEffect(() => {
    if (isAnonymous && typeof window !== "undefined") {
      if (!localStorage.getItem("fp_anon_id")) {
        localStorage.setItem("fp_anon_id", crypto.randomUUID());
      }
      if (!localStorage.getItem("fp_anon_count")) {
        localStorage.setItem("fp_anon_count", "0");
      }
    }
  }, [isAnonymous]);

  const placeholders = [
    "Describe your crazy idea in plain English...",
    "I want to build an app that...",
    "Make me a full-stack app before my coffee cools down...",
    "Type what you're imagining, I'll code it out..."
  ];

  // Placeholder rotation
  useEffect(() => {
    if (isInputFocused || input.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isInputFocused, input.length]);

  // Loading phrase rotation (Sequential Layer Counter)
  useEffect(() => {
    if (!isThinking) {
      setLoadingPhraseIndex(1); // Reset back to Layer 1 when not thinking
      return;
    }
    const interval = setInterval(() => {
      setLoadingPhraseIndex(prev => {
        if (prev < 17) return prev + 1;
        return prev; // Stop at 17 ("Mentor Power")
      });
    }, 600);
    return () => clearInterval(interval);
  }, [isThinking]);

  // File and multimedia upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  useEffect(() => {
    const handleNewThread = () => {
      setMessages([]);
      setInput("");
      setIsThinking(false);
      setIsLoadingThread(false);
      setThreadId(null);
      setEditingMessageId(null);
    };

    const handleLoadThread = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const tId = customEvent.detail?.threadId;
      if (!tId) return;
      
      setThreadId(tId);
      setMessages([]);
      setInput("");
      setIsThinking(false);
      setIsLoadingThread(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/api/v1/threads/${tId}/messages`, {
          headers: { "Authorization": `Bearer ${session?.access_token}` }
        });
        const data = await res.json();
        
        if (data?.data && Array.isArray(data.data)) {
          setMessages(data.data.map((m: any) => ({
            id: m.id,
            role: m.role,
            text: m.content,
            createdAt: m.created_at || m.createdAt
          })));
        }
      } catch (err) {
        console.error("Failed to load thread messages", err);
      } finally {
        setIsLoadingThread(false);
      }
    };

    window.addEventListener("new-thread", handleNewThread);
    window.addEventListener("load-thread", handleLoadThread);
    const handleGlobalClick = () => {
      if (activeMessageId) setActiveMessageId(null);
    };
    window.addEventListener("click", handleGlobalClick);
    return () => {
      window.removeEventListener("new-thread", handleNewThread);
      window.removeEventListener("load-thread", handleLoadThread);
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [activeMessageId]);

  // Handle textarea height auto adjustment
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...filesArray]);

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
    setFilePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsRecording(true);
    };

    rec.onerror = (e: any) => {
      console.error(e);
      setIsRecording(false);
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + transcript);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      startSpeechRecognition();
    }
  };

  const handleSend = useCallback(async (options?: string | { isRetry?: boolean }) => {
    const isRetry = typeof options === 'object' ? options.isRetry : false;
    const textVal = typeof options === 'string' ? options : input;
    const text = textVal.trim();
    if (!text && selectedFiles.length === 0 && !isRetry) return;

    if (isAnonymous) {
      const currentCount = parseInt(localStorage.getItem("fp_anon_count") || "0");
      if (currentCount >= 3) {
        setMessages(prev => [...prev, { id: 'limit', role: 'fp', text: "You've reached your free limit. Sign up to continue chatting!" }]);
        return;
      }
      localStorage.setItem("fp_anon_count", String(currentCount + 1));
    }

    if (isThinking) return;

    let currentMessages = [...messages];

    // If editing, truncate everything from the edited message onwards
    if (editingMessageId && !isRetry) {
      const idx = currentMessages.findIndex(m => m.id === editingMessageId);
      if (idx !== -1) {
        currentMessages = currentMessages.slice(0, idx);
      }
      setEditingMessageId(null);
    }

    // If retry, truncate the last AI message
    if (isRetry) {
      let lastUserIdx = -1;
      for (let i = currentMessages.length - 1; i >= 0; i--) {
        if (currentMessages[i].role === "user") {
          lastUserIdx = i;
          break;
        }
      }
      if (lastUserIdx !== -1) {
        currentMessages = currentMessages.slice(0, lastUserIdx + 1);
      } else {
        return;
      }
    }

    const filesPayload = selectedFiles.map((file, idx) => ({
      name: file.name,
      url: filePreviews[idx],
      type: file.type,
    }));

    if (!isRetry) {
      currentMessages.push({
        id: String(Date.now()),
        role: "user",
        text,
        files: filesPayload,
        createdAt: new Date().toISOString(),
      });
    }

    setMessages(currentMessages);
    setInput("");
    setSelectedFiles([]);
    setFilePreviews([]);
    setIsThinking(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const historyPayload = currentMessages.slice(0, -1).map((m) => {
        let textStr = m.text;
        if (m.createdAt) {
          try {
            const dt = new Date(m.createdAt);
            const dateStr = dt.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            textStr = `[Sent: ${dateStr}]\n${textStr}`;
          } catch(e) {}
        }
        return {
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: textStr }]
        };
      });
      
      let payloadMessage = currentMessages[currentMessages.length - 1]?.text || "";


      let contextPayload = "Lumensky user";
      try {
        const diagStr = localStorage.getItem("diagnosticResult");
        if (diagStr) {
          const diag = JSON.parse(diagStr);
          contextPayload = `[PSYCHOLOGICAL DIAGNOSTIC (16-Layer Profile)]\n` + 
            `Goal: ${diag.declaredGoal || 'N/A'}\n` +
            `Cognitive Endurance: ${diag.cognitiveEnduranceMinutes || 'N/A'} mins\n` +
            `Risk Tolerance: ${diag.riskTolerance || 'N/A'}\n` +
            `Baseline Discipline: ${diag.baselineDiscipline || 'N/A'}\n` +
            `Friction Profile: ${JSON.stringify(diag.frictionProfile || {})}\n` +
            `Capability Vector: ${JSON.stringify(diag.capabilityVector || {})}\n` +
            `Context Matrix: ${JSON.stringify(diag.contextMatrix || {})}`;
        }
      } catch(e) {}

      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

      const res = await fetch(`${baseUrl}/api/v1/oracle/chat/stream`, {
        method: "POST",
        signal: controller.signal,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": session?.access_token ? `Bearer ${session.access_token}` : "",
          ...(isAnonymous ? { "X-Anonymous-Id": localStorage.getItem("fp_anon_id") || "anon" } : {})
        },
        body: JSON.stringify({
          message: payloadMessage,
          conversationHistory: historyPayload,
          studentContext: contextPayload
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Network response was not ok");
      }

      // Check if the response is JSON (e.g. error or non-streaming fallback)
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        // handle JSON exactly as before
        if (data?.data?.thread_id && !threadId) {
          setThreadId(data.data.thread_id);
          window.dispatchEvent(new Event('refresh-sidebar'));
        }
        let reply = "Parameter logged.";
        if (data?.error) {
          reply = "System Notification: A brief network anomaly occurred. Please re-transmit your parameter.";
        } else if (data?.data?.ai_response?.response_text) {
          reply = data.data.ai_response.response_text;
        }
        if (data?.data?.engine_result?.type === "onboarding_complete") {
          setSimulationData(data.data.engine_result.data);
        }
        setMessages((prev) => [...prev, { id: String(Date.now()), role: "fp", text: reply, createdAt: new Date().toISOString() }]);
      } else {
        // SSE STREAMING MODE
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        
        let accumulatedReply = "";
        let newMsgId = String(Date.now());
        let streamBuffer = "";
        
        // Push an empty message first — but keep isThinking=true until first chunk arrives
        setMessages((prev) => [...prev, { id: newMsgId, role: "fp", text: "", createdAt: new Date().toISOString() }]);
        setIsStreaming(true);
        let firstChunkReceived = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            streamBuffer += chunk;
            const lines = streamBuffer.split("\n");
            // The last element is always the remainder after the last newline (can be empty string)
            streamBuffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.startsWith("event: done")) { done = true; break; }
              if (line.startsWith("event: error")) {
                const errDataStr = lines[lines.indexOf(line) + 1]?.slice(6);
                let errMsg = "Stream error occurred.";
                try { errMsg = JSON.parse(errDataStr || "{}").message || errMsg; } catch(e) {}
                accumulatedReply += `\n\n[System Notification: ${errMsg}]`;
                setMessages((prev) => prev.map((m) => m.id === newMsgId ? { ...m, text: accumulatedReply } : m));
                done = true;
                break;
              }

              if (line.startsWith("event: soul")) {
                // Next line should be data with soul metadata
                continue;
              }

              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6);
                if (dataStr === "[DONE]") {
                  done = true;
                  break;
                }
                
                try {
                  const eventData = JSON.parse(dataStr);
                  if (eventData.soul) {
                    if (eventData.thread_id && !threadId) {
                      setThreadId(eventData.thread_id);
                      window.dispatchEvent(new Event('refresh-sidebar'));
                      window.history.pushState({}, '', `?t=${eventData.thread_id}`);
                    }
                    const newSoul = {
                      name: eventData.soulName,
                      emoji: eventData.emoji,
                      color: eventData.color
                    };
                    setActiveSoul(newSoul);
                    // Add soul to the current streaming message
                    setMessages((prev) => 
                      prev.map((m) => m.id === newMsgId ? { ...m, soul: newSoul.name, soulEmoji: newSoul.emoji, soulColor: newSoul.color } : m)
                    );
                    continue;
                  } else if (eventData.chunk !== undefined) {
                    accumulatedReply += eventData.chunk;
                    if (!firstChunkReceived) {
                      firstChunkReceived = true;
                      setIsThinking(false);
                    }
                    setMessages((prev) => 
                      prev.map((m) => m.id === newMsgId ? { ...m, text: accumulatedReply } : m)
                    );
                    scrollToBottom();
                  }
                } catch (e) {
                  // Legacy fallback: If it's not JSON, it's raw text chunk from Oracle!
                  if (dataStr) {
                    accumulatedReply += dataStr;
                    if (!firstChunkReceived) {
                      firstChunkReceived = true;
                      setIsThinking(false);
                    }
                    setMessages((prev) => 
                      prev.map((m) => m.id === newMsgId ? { ...m, text: accumulatedReply } : m)
                    );
                    scrollToBottom();
                  }
                }
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
        setIsThinking(false);
        return;
      }
      console.error("CRITICAL FETCH ERROR:", error);
      const errorMsg = isAnonymous 
        ? "Network issue right now, bro. Please try again. 🔁" 
        : "Abhi connectivity issue hai bhai. Ek baar dobara try kar. 🔁";
      setMessages((prev) => [
        ...prev,
        { id: String(Date.now()), role: "fp", text: errorMsg },
      ]);
    } finally {
      setIsThinking(false);
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }, [input, isThinking, messages, selectedFiles, filePreviews, editingMessageId, isAnonymous, onRequireAuth, threadId]);

  const proceedToSimulation = () => {
    if (!simulationData) return;
    localStorage.setItem("diagnosticResult", JSON.stringify(simulationData.userRuntime));
    localStorage.setItem("architectResult", JSON.stringify(simulationData));
    router.push("/gate");
  };

  const copyToClipboard = (id: string, txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetry = useCallback(() => {
    if (messages.length === 0) return;
    handleSend({ isRetry: true });
  }, [messages, handleSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageClick = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    if (activeMessageId === id) {
      setActiveMessageId(null);
    } else {
      setActiveMessageId(id);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };

  const isInitial = messages.length === 0 && !isLoadingThread;

  return (
    <div className="flex-1 flex flex-col min-w-0 relative h-screen bg-[#000000] text-white font-sans overflow-hidden" style={{ height: '100dvh' }}>
      
      <svg width="0" height="0" className="absolute pointer-events-none">
        <filter id="liquid-spill">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -6" result="liquid" />
          <feComposite in="SourceGraphic" in2="liquid" operator="atop" />
        </filter>
      </svg>

      {/* CSS Animation definitions for smooth message reveals */}
      <style>{`
        .liquid-streaming-text {
          filter: url(#liquid-spill);
          animation: pulseBleed 0.6s infinite alternate;
        }
        @keyframes pulseBleed {
          0% { text-shadow: 0 0 2px rgba(255,255,255,0.4); opacity: 0.85; }
          100% { text-shadow: 0 0 12px rgba(255,255,255,0.7); opacity: 1; }
        }
        /* Smooth message entrance transition */
        .animate-message-reveal {
          opacity: 0;
          transform: translateY(12px);
          animation: messageEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes messageEntrance {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Staggered load transitions for main chat screen (Trajectory Forge style) */
        @keyframes revealChatItem {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .reveal-chat-item {
          opacity: 0;
          animation: revealChatItem 650ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Suggestion card hover lift transition */
        .suggestion-card-transition {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, background-color 0.25s ease;
        }

        /* Action triggers hover dynamics */
        .action-icon-btn {
        }
        
        .suggestion-card-transition:hover {
          transform: translateY(-2.5px);
          background-color: #0c0c0e !important;
          border-color: rgba(255, 255, 255, 0.12) !important;
        }

        /* Input area transitions */
        .input-console-transition {
          transition: border-color 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s ease;
        }
        
        .input-console-transition:focus-within {
          border-color: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-2px);
          background-color: #18181b !important;
        }

        /* Action triggers hover dynamics */
        .action-icon-btn {
          transition: color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
        }
        
        .action-icon-btn:hover {
          transform: scale(1.05);
        }

        @keyframes placeholderFadeUp {
          0% { opacity: 0; transform: translateY(4px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .animate-placeholder {
          animation: placeholderFadeUp 3s ease-in-out infinite;
        }

        /* Skeleton loading animation */
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.04; }
          50% { opacity: 0.08; }
        }
        .skeleton-line {
          background: white;
          border-radius: 8px;
          animation: skeletonPulse 1.5s ease-in-out infinite;
        }

        /* Audio visualizer wave */
        @keyframes audioWave {
          0%, 100% { height: 4px; opacity: 0.6; }
          50% { height: 12px; opacity: 1; }
        }
        .animate-audio-wave-1 { animation: audioWave 0.9s ease-in-out infinite; }
        .animate-audio-wave-2 { animation: audioWave 0.9s ease-in-out infinite 0.15s; }
        .animate-audio-wave-3 { animation: audioWave 0.9s ease-in-out infinite 0.3s; }
        .animate-audio-wave-4 { animation: audioWave 0.9s ease-in-out infinite 0.45s; }
      `}</style>

      {/* ── Top Bar Header (Trajectory Forge style) ── */}
      <header 
        className="reveal-chat-item absolute top-0 inset-x-0 h-14 flex items-center justify-between px-6 bg-transparent z-30 pointer-events-none"
        style={{ animationDelay: "0ms" }}
      >
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Menu trigger */}
          <button
            onClick={onOpenSidebar}
            className="relative z-[9999] size-9 grid place-items-center bg-transparent text-white hover:text-gray-300 cursor-pointer transition-colors"
          >
            <Menu className="size-5" />
          </button>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 md:gap-2 -mr-1 pointer-events-auto">
          <button 
            onClick={() => window.dispatchEvent(new Event('new-thread'))}
            className="p-2 text-[#ffffff] hover:text-[#f4f4f5] active:scale-90 transition-all cursor-pointer drop-shadow-[0_0_12px_rgba(255, 255, 255,0.6)]"
          >
            <Plus className="size-6" />
          </button>
        </div>
      </header>

      {/* ── Message stream area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar relative z-10 pt-16">
        <div className="max-w-[720px] mx-auto px-4 md:px-8 min-h-full flex flex-col">
          
          {isLoadingThread ? (
            /* Skeleton Loading State for old thread */
            <div className="py-6 space-y-6 animate-message-reveal">
              {/* Skeleton: user message right-aligned */}
              <div className="flex justify-end">
                <div className="max-w-[65%] space-y-2">
                  <div className="skeleton-line h-[18px] w-[220px] ml-auto" />
                  <div className="skeleton-line h-[18px] w-[160px] ml-auto" />
                </div>
              </div>
              {/* Skeleton: AI message left-aligned */}
              <div className="flex justify-start">
                <div className="max-w-[80%] space-y-2.5">
                  <div className="skeleton-line h-[16px] w-[300px]" />
                  <div className="skeleton-line h-[16px] w-[260px]" />
                  <div className="skeleton-line h-[16px] w-[340px]" />
                  <div className="skeleton-line h-[16px] w-[200px]" />
                </div>
              </div>
              {/* Skeleton: another user message */}
              <div className="flex justify-end">
                <div className="max-w-[65%] space-y-2">
                  <div className="skeleton-line h-[18px] w-[180px] ml-auto" />
                </div>
              </div>
              {/* Skeleton: another AI response */}
              <div className="flex justify-start">
                <div className="max-w-[80%] space-y-2.5">
                  <div className="skeleton-line h-[16px] w-[280px]" />
                  <div className="skeleton-line h-[16px] w-[320px]" />
                  <div className="skeleton-line h-[16px] w-[240px]" />
                </div>
              </div>
            </div>
          ) : isInitial ? (
            /* Minimalist Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">
              <div 
                className="reveal-chat-item relative flex flex-col items-center justify-center w-full isolate"
                style={{ animationDelay: "50ms" }}
              >
                <h2 className="text-[28px] md:text-[36px] font-medium tracking-tight text-white text-center font-sans leading-tight relative z-10 pb-0.5">
                  {greeting.text}
                </h2>
                <h2 
                  className={`text-[28px] md:text-[36px] font-medium tracking-tight text-center font-sans leading-tight text-[#ffffff] relative z-10 pb-2 ${greeting.animateAccent ? 'shimmer-text-white' : ''}`} 
                  style={{ textShadow: "0 0 15px rgba(255,255,255,0.3)" }}
                >
                  {greeting.accent}
                </h2>
              </div>
            </div>
          ) : (
            /* Messages list (bubbleless, flat style) */
            <div className="py-4 space-y-4">
              {messages.map((m) => {
                const isUser = m.role === "user";

                return (
                  <div key={m.id} className="animate-message-reveal">
                    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      
                      {isUser ? (
                        editingMessageId === m.id ? (
                          /* God-level Inline Edit UI */
                          <div className="relative flex flex-col items-end w-full max-w-[85%] animate-message-reveal">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              autoFocus
                              rows={Math.max(1, editText.split('\n').length)}
                              className="w-full bg-[#0c0c0e]/80 backdrop-blur-3xl border border-white/20 text-white px-5 py-3 rounded-[24px] resize-none outline-none focus:border-white/50 focus:shadow-[0_0_25px_rgba(255,255,255,0.15)] transition-all overflow-hidden text-[15px] leading-[1.5] min-h-[48px]"
                            />
                            <div className="flex justify-end gap-2 mt-3">
                              <button 
                                onClick={() => setEditingMessageId(null)} 
                                className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-[#a1a1aa] hover:text-white transition-colors text-sm font-medium"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleSend(editText)} 
                                disabled={!editText.trim()}
                                className="px-5 py-2 rounded-2xl bg-white text-black hover:scale-[1.03] active:scale-95 transition-transform text-sm font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:hover:scale-100"
                              >
                                Save & Submit
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* User message: Dark bubble with optional files */
                          <div 
                            className="relative flex flex-col items-end group max-w-[80%] cursor-pointer md:cursor-auto"
                            onClick={(e) => handleMessageClick(e, m.id)}
                          >
                            <div className="bg-white/[0.04] /[0.06] backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] text-white text-[15px] font-medium leading-[1.6] px-5 py-3.5 rounded-[24px] select-text space-y-2.5 break-words max-w-full overflow-hidden">
                            {m.text && <div>{m.text}</div>}
                            {m.files && m.files.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {m.files.map((file, fIdx) => (
                                  <a
                                    key={fIdx}
                                    href={file.url}
                                    download={file.name}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition text-xs text-[#a1a1aa] hover:text-white max-w-full"
                                  >
                                    {file.type.startsWith("image/") ? (
                                      <img src={file.url} alt="attached file" className="max-h-[140px] rounded-lg object-cover" />
                                    ) : (
                                      <>
                                        <Paperclip className="size-3.5" />
                                        <span className="truncate max-w-[140px]">{file.name}</span>
                                      </>
                                    )}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Actions row for user */}
                          <div className={`flex items-center gap-3 transition-all duration-300 text-[#a1a1aa] origin-top-right ${
                            activeMessageId === m.id 
                              ? "mt-2 bg-black text-white px-4 py-2.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/30 opacity-100 scale-100" 
                              : "hidden opacity-0 scale-95"
                          }`}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingMessageId(m.id); setEditText(m.text); setActiveMessageId(null); }} 
                              className="p-1 hover:text-white transition-colors" 
                            >
                              <Edit className="size-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(m.id, m.text); }} 
                              className="p-1 hover:text-white transition-colors" 
                            >
                              {copiedId === m.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                            </button>
                          </div>
                        </div>
                      )) : (
                        /* Lumensky message: Bubbleless raw text */
                        <div 
                          className="relative flex-1 space-y-4 select-text min-w-0 max-w-full group cursor-pointer md:cursor-auto"
                          onClick={(e) => handleMessageClick(e, m.id)}
                        >
                          <div className="w-full">
                            <MarkdownRenderer content={m.text} />
                          </div>

                          {/* Actions row */}
                          <div className={`flex items-center gap-4 transition-all duration-300 text-[#a1a1aa] origin-top-left ${
                            activeMessageId === m.id 
                              ? "mt-2 bg-black text-white px-4 py-2.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/30 opacity-100 scale-100 w-max" 
                              : "hidden opacity-0 scale-95"
                          }`}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleRetry(); setActiveMessageId(null); }}
                              className="p-1 hover:text-white cursor-pointer transition-colors"
                            >
                              <RefreshCw className="size-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(m.id, m.text); }}
                              className="p-1 hover:text-white cursor-pointer transition-colors"
                            >
                              {copiedId === m.id ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {/* Professional Orbiting Dots Loader */}
              {isThinking && (
                <div className="flex justify-start animate-message-reveal">
                  <div className="flex items-center gap-3 px-1 py-3">
                    <style>{`
                      .gyro-container {
                        position: relative;
                        width: 22px;
                        height: 22px;
                        perspective: 120px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      }
                      .gyro-core {
                        position: absolute;
                        width: 4px;
                        height: 4px;
                        background: #fff;
                        border-radius: 50%;
                        animation: corePulse 1.5s ease-in-out infinite alternate;
                      }
                      .gyro-ring {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        border-radius: 50%;
                        border: 1px solid transparent;
                        border-top: 2px solid rgba(255,255,255,1);
                        border-right: 1.5px solid rgba(255,255,255,0.4);
                        border-left: 1px solid rgba(255,255,255,0.1);
                      }
                      .ring-1 { animation: spin1 1.8s linear infinite; }
                      .ring-2 { animation: spin2 2.4s linear infinite; }
                      .ring-3 { animation: spin3 3s linear infinite; }

                      @keyframes spin1 { 
                        0% { transform: rotateX(65deg) rotateY(0deg) rotateZ(0deg); }
                        100% { transform: rotateX(65deg) rotateY(0deg) rotateZ(360deg); } 
                      }
                      @keyframes spin2 { 
                        0% { transform: rotateX(0deg) rotateY(65deg) rotateZ(0deg); }
                        100% { transform: rotateX(0deg) rotateY(65deg) rotateZ(360deg); } 
                      }
                      @keyframes spin3 { 
                        0% { transform: rotateX(45deg) rotateY(45deg) rotateZ(0deg); }
                        100% { transform: rotateX(45deg) rotateY(45deg) rotateZ(360deg); } 
                      }
                      @keyframes corePulse {
                        0% { transform: scale(0.8); opacity: 0.6; box-shadow: 0 0 2px rgba(255,255,255,0.4); }
                        100% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 6px rgba(255,255,255,0.8); }
                      }
                      
                      @keyframes shimmerText {
                        0% { background-position: -200% center; }
                        100% { background-position: 200% center; }
                      }
                      .loading-text-prof {
                        font-family: 'Inter', sans-serif;
                        font-weight: 600;
                        font-size: 13px;
                        letter-spacing: 0.1em;
                        text-transform: uppercase;
                        background: linear-gradient(90deg, #444 0%, #fff 50%, #444 100%);
                        background-size: 200% auto;
                        color: transparent;
                        -webkit-background-clip: text;
                        background-clip: text;
                        animation: shimmerText 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                      }
                    `}</style>
                    <GyroLogo size={22} />
                    {/* Rotating status text */}
                    <span 
                      key={loadingPhraseIndex} 
                      className="loading-text-prof"
                    >
                      {loadingPhraseIndex < 17 ? `Layer ${loadingPhraseIndex}` : "Mentor Power"}
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* ── Input Box (Trajectory Forge copy) ── */}
      <div 
        className="shrink-0 px-4 md:px-8 pt-2 bg-[#000000] relative z-10"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div 
          className="reveal-chat-item max-w-[720px] w-full mx-auto"
          style={{ animationDelay: "550ms" }}
        >
          
          {/* Sleek Apple-inspired floating capsule without glow */}
          <div className={`input-console-transition flex items-center gap-1.5 md:gap-3 bg-black rounded-[32px] px-3 py-2 md:py-2.5 min-h-[64px] border transition-colors duration-300 ${isThinking ? "border-transparent" : "border-white/40"}`}>
            
            {/* Left Action - Attach */}
            <div className="relative shrink-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsAttachMenuOpen(!isAttachMenuOpen);
                }}
                className={`size-10 rounded-full grid place-items-center transition-all duration-200 cursor-pointer active:scale-90 active:bg-white/10 ${isAttachMenuOpen ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-[#a1a1aa] hover:text-white'}`}
                title="Attach"
              >
                <Plus className={`size-[22px] transition-transform duration-200 ${isAttachMenuOpen ? 'rotate-45' : ''}`} />
              </button>

              {/* Attachment Menu Popover */}
              {isAttachMenuOpen && (
                <div className="absolute bottom-full left-0 mb-4 bg-[#1a1b1e] rounded-[24px] p-2 flex flex-col shadow-2xl min-w-[160px] animate-scale-in origin-bottom-left z-50 overflow-hidden max-h-[50vh] overflow-y-auto">
                  <div className="flex flex-col gap-1 animate-fade-in">
                    <button 
                      onClick={() => { cameraInputRef.current?.click(); setIsAttachMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-[#d4d4d8] hover:text-white transition-colors text-[14px] text-left cursor-pointer"
                    >
                      <Camera className="size-[18px]" />
                      <span>Camera</span>
                    </button>
                    <button 
                      onClick={() => { photosInputRef.current?.click(); setIsAttachMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-[#d4d4d8] hover:text-white transition-colors text-[14px] text-left cursor-pointer"
                    >
                      <Image className="size-[18px]" />
                      <span>Photos</span>
                    </button>
                    <button 
                      onClick={() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-[#d4d4d8] hover:text-white transition-colors text-[14px] text-left cursor-pointer"
                    >
                      <Paperclip className="size-[18px]" />
                      <span>Files</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              {/* Previews of selected files */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 pb-1">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 text-[12px] text-[#a1a1aa] pr-8 animate-message-reveal">
                      {file.type.startsWith("image/") ? (
                        <img src={filePreviews[idx]} alt="preview" className="size-5 object-cover rounded" />
                      ) : (
                        <Paperclip className="size-3.5" />
                      )}
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {isRecording && (
                <div className="flex items-center gap-3 px-2 py-1 text-[13px] text-red-400 font-medium tracking-wide">
                  <div className="flex items-center gap-[3px] h-3">
                    <span className="w-[3px] bg-red-500 rounded-full animate-audio-wave-1 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    <span className="w-[3px] bg-red-500 rounded-full animate-audio-wave-2 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    <span className="w-[3px] bg-red-500 rounded-full animate-audio-wave-3 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    <span className="w-[3px] bg-red-500 rounded-full animate-audio-wave-4 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  </div>
                  <span className="animate-pulse">Listening...</span>
                </div>
              )}

              <div className="relative flex-1 flex flex-col justify-center min-w-0 min-h-[24px]">
                {!(isInputFocused || input.length > 0) && (
                  <div className="absolute inset-y-0 left-1 right-2 flex items-center pointer-events-none overflow-hidden h-full">
                    <span 
                      key={placeholderIndex} 
                      className="text-[#888888] text-[15px] sm:text-[16px] animate-placeholder whitespace-nowrap truncate w-full"
                    >
                      {placeholders[placeholderIndex]}
                    </span>
                  </div>
                )}
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    className={`w-full bg-transparent outline-none resize-none text-[16px] py-1 px-1 no-scrollbar leading-[1.5] self-center my-auto transition-colors duration-200 ${input.length > 0 ? "text-white" : "text-[#71717a]"}`}
                    style={{ maxHeight: 120 }}
                  />
              </div>

              {/* Hidden file inputs */}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" />
              <input type="file" accept="image/*,video/*" ref={photosInputRef} onChange={handleFileChange} multiple className="hidden" />
              <input type="file" accept="image/*" ref={cameraInputRef} onChange={handleFileChange} capture="environment" className="hidden" />
            </div>

            {/* Right Actions - Mic & Send */}
            <div className="shrink-0 flex items-center gap-1.5">
              <button 
                type="button"
                onClick={toggleRecording}
                className={`size-10 rounded-full grid place-items-center cursor-pointer transition-all duration-300 active:scale-90 active:bg-white/10 relative ${
                  isRecording ? "bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]" : "hover:bg-white/10 text-[#a1a1aa] hover:text-white"
                }`}
                title={isRecording ? "Stop voice input" : "Voice input"}
              >
                {isRecording && (
                  <span className="absolute inset-0 rounded-full border border-red-500/50 animate-ping opacity-75" />
                )}
                <Mic className="size-[20px] relative z-10" />
              </button>

              <button
                onClick={() => {
                  if (isThinking) {
                    abortControllerRef.current?.abort();
                  } else {
                    handleSend();
                  }
                }}
                className={`action-icon-btn size-10 rounded-full grid place-items-center transition-all duration-500 cursor-pointer relative z-10 ${
                  isThinking 
                    ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-90 shadow-[0_0_20px_rgba(239,68,68,0.15)] border border-red-500/20"
                    : (!input.trim() && selectedFiles.length === 0)
                      ? "bg-white/5 text-white/30 border border-white/5"
                      : "bg-white text-black hover:scale-[1.05] active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.3)]"
                }`}
              >
                {/* Active glow ring */}
                {!isThinking && (input.trim() || selectedFiles.length > 0) && (
                  <span className="absolute inset-0 rounded-full border border-white/50 animate-pulse pointer-events-none" />
                )}
                
                {isThinking ? (
                  <Square className="size-[14px] fill-red-400 text-red-400" />
                ) : (
                  <ArrowUp className="size-[20px] stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>

          {/* Subtext info */}
          <div className="mt-3 text-center">
            <span className="font-sans text-[11px] text-[#52525b]">
              Lumensky generates code in real-time. Always review before shipping.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
// Trigger Vercel Deploy  
