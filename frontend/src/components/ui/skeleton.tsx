/**
 * Skeleton Loading Components
 * Reusable skeletons for the entire app
 */

import React from "react";

// ── Base Skeleton Pulse Block ──────────────────────────────────────────────────
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.06] ${className}`}
    />
  );
}

// ── Sidebar Chat History Skeleton ─────────────────────────────────────────────
export function SidebarHistorySkeleton() {
  return (
    <div className="flex flex-col gap-4 px-3 py-4">
      {/* Group label */}
      <div className="space-y-1">
        <Skeleton className="h-2.5 w-16 mb-2 rounded" />
        <Skeleton className="h-7 w-full rounded-lg" />
        <Skeleton className="h-7 w-[90%] rounded-lg" />
        <Skeleton className="h-7 w-[80%] rounded-lg" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-2.5 w-20 mb-2 rounded" />
        <Skeleton className="h-7 w-full rounded-lg" />
        <Skeleton className="h-7 w-[85%] rounded-lg" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-2.5 w-24 mb-2 rounded" />
        <Skeleton className="h-7 w-full rounded-lg" />
        <Skeleton className="h-7 w-[75%] rounded-lg" />
        <Skeleton className="h-7 w-[90%] rounded-lg" />
      </div>
    </div>
  );
}

// ── Chat Message Skeleton (for loading old thread) ────────────────────────────
export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} py-2`}>
      {!isUser && (
        <Skeleton className="size-8 rounded-full shrink-0" />
      )}
      <div className={`flex flex-col gap-2 max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        <Skeleton className="h-4 w-48 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
        <Skeleton className="h-4 w-40 rounded-full" />
      </div>
    </div>
  );
}

export function ChatLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6 w-full max-w-3xl mx-auto">
      <ChatMessageSkeleton isUser />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isUser />
      <ChatMessageSkeleton />
      <ChatMessageSkeleton isUser />
    </div>
  );
}

// ── Vault Modal Skeleton ──────────────────────────────────────────────────────
export function VaultMissionSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[75%]" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[80%]" />
      </div>
    </div>
  );
}

export function VaultMirrorSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="glass-card rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-6 w-32 rounded" />
        </div>
        {/* Bar graph skeleton */}
        <div className="flex items-end gap-3 h-[140px]">
          {[60, 85, 40, 90, 70, 55, 80].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function VaultMarketSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="rounded-2xl p-6 bg-gradient-to-br from-[#1a0505] to-black space-y-4">
        <Skeleton className="h-3 w-36 bg-red-900/40" />
        <Skeleton className="h-7 w-[80%] bg-red-900/30" />
        <Skeleton className="h-4 w-full bg-red-900/20" />
        <Skeleton className="h-4 w-[90%] bg-red-900/20" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <Skeleton className="h-4 w-32" />
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[#09090b]">
              <div className="flex gap-3 items-center">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          ))}
        </div>
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <Skeleton className="h-4 w-28" />
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-xl bg-[#09090b] space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[70%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VaultRivalSkeleton() {
  return (
    <div className="space-y-4 w-full">
      <div className="glass-card rounded-2xl p-8 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[85%]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-[80%]" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-48 bg-red-900/20" />
            <Skeleton className="h-[1px] w-12 bg-red-900/30" />
          </div>
        </div>
        {/* Dial skeletons */}
        <div className="flex justify-around pt-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="size-28 rounded-full" />
              <Skeleton className="h-2 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Oracle Chat Skeleton ──────────────────────────────────────────────────────
export function OracleChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 w-full">
      {/* Soul Badge skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      {/* Welcome message skeleton */}
      <div className="space-y-2 max-w-md">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[70%]" />
      </div>
    </div>
  );
}

// ── AI Thinking Bubble (the 3-dot bounce) ─────────────────────────────────────
export function ThinkingBubble() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-white/[0.04] border border-white/[0.06] w-fit">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="size-1.5 rounded-full bg-white/40"
          style={{
            animation: `thinking-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes thinking-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
