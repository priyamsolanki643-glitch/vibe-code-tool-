"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Trash2, MoreVertical, MessageSquare, Calendar } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { SidebarHistorySkeleton } from "@/components/ui/skeleton";

interface ChatThread {
  id: string;
  title: string;
  updated_at: string;
}

interface MonthGroup {
  label: string; // e.g. "June 2026"
  chats: ChatThread[];
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChatMenu, setActiveChatMenu] = useState<string | null>(null);

  const fetchHistory = async (query?: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
      const url = new URL(`${baseUrl}/api/v1/threads`);
      url.searchParams.append("t", String(Date.now()));
      if (query) url.searchParams.append("q", query);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const data = await res.json();

      if (data?.data && Array.isArray(data.data)) {
        // Cut-off: older than 7 days only
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - 7);

        const oldChats: ChatThread[] = data.data.filter((t: ChatThread) => {
          return new Date(t.updated_at) < cutoff;
        });

        // Group by Month + Year
        const grouped: Record<string, ChatThread[]> = {};
        oldChats.forEach((t: ChatThread) => {
          const d = new Date(t.updated_at);
          const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" });
          if (!grouped[label]) grouped[label] = [];
          grouped[label].push(t);
        });

        // Sort groups: most recent month first
        const sorted = Object.entries(grouped)
          .sort(([a], [b]) => {
            const da = new Date(grouped[a][0].updated_at);
            const db = new Date(grouped[b][0].updated_at);
            return db.getTime() - da.getTime();
          })
          .map(([label, chats]) => ({ label, chats }));

        setMonthGroups(sorted);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const handleClick = () => setActiveChatMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => fetchHistory(searchQuery), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const deleteChat = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic UI
    setMonthGroups(prev =>
      prev
        .map(g => ({ ...g, chats: g.chats.filter(c => c.id !== threadId) }))
        .filter(g => g.chats.length > 0)
    );
    setActiveChatMenu(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
      await fetch(`${baseUrl}/api/v1/threads/${threadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
    } catch (err) {
      console.error("Failed to delete thread", err);
      fetchHistory();
    }
  };

  const openChat = (threadId: string) => {
    router.push("/");
    // Small delay to let main page mount, then dispatch
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("load-thread", { detail: { threadId } }));
    }, 300);
  };

  const totalChats = monthGroups.reduce((acc, g) => acc + g.chats.length, 0);

  return (
    <main
      className="min-h-screen bg-[#000000] text-white font-sans overflow-x-hidden"
      style={{ minHeight: "100dvh" }}
      onClick={() => setActiveChatMenu(null)}
    >
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-white/[0.02] blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:px-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center justify-center size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-semibold text-white tracking-tight leading-tight">
              Chat History
            </h1>
            <p className="text-[12px] text-[#52525b] mt-0.5">
              {isLoading ? "Loading..." : `${totalChats} conversations older than 7 days`}
            </p>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#52525b]" />
          <input
            type="text"
            placeholder="Search past conversations..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-[14px] text-white placeholder:text-[#52525b] outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <SidebarHistorySkeleton />
        ) : monthGroups.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="size-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-2">
              <MessageSquare className="size-7 text-[#52525b]" />
            </div>
            <h2 className="text-[16px] font-medium text-white">No older conversations</h2>
            <p className="text-[13px] text-[#52525b] max-w-xs leading-relaxed">
              {searchQuery
                ? "No conversations match your search."
                : "Conversations older than 7 days will appear here."}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-6 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-white/90 transition-colors cursor-pointer"
            >
              Back to Chat
            </button>
          </div>
        ) : (
          /* Month-grouped list */
          <div className="flex flex-col gap-8">
            {monthGroups.map((group, gi) => (
              <div key={gi}>
                {/* Month label */}
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="size-3.5 text-[#52525b] shrink-0" />
                  <span className="text-[11px] font-semibold text-[#52525b] tracking-widest uppercase">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <span className="text-[10px] text-[#3f3f46]">{group.chats.length}</span>
                </div>

                {/* Chat list */}
                <div className="flex flex-col gap-1">
                  {group.chats.map((chat, ci) => (
                    <div key={chat.id} className="group relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openChat(chat.id)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all text-[14px] text-[#a1a1aa] hover:text-white flex items-start justify-between gap-3 group cursor-pointer"
                      >
                        <span className="truncate leading-snug flex-1">{chat.title}</span>
                        <span className="text-[11px] text-[#3f3f46] shrink-0 mt-0.5">
                          {new Date(chat.updated_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </button>

                      {/* 3-dot menu */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setActiveChatMenu(activeChatMenu === chat.id ? null : chat.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#52525b] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-white/5 cursor-pointer"
                      >
                        <MoreVertical className="size-3.5" />
                      </button>

                      {activeChatMenu === chat.id && (
                        <div className="absolute right-2 top-10 z-50 w-32 bg-[#111111] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden">
                          <button
                            onClick={e => deleteChat(chat.id, e)}
                            className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-[12px] text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
