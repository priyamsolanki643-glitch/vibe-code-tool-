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
