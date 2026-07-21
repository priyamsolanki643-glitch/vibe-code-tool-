"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Archive, LogOut, MoreVertical, Trash2, Atom, Target, Clock } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { SidebarHistorySkeleton } from "./ui/skeleton";

import { GyroLogo } from "./gyro-logo";

interface ChatThread {
  id: string;
  title: string;
  updated_at: string;
}

interface HistoryGroup {
  group: string;
  chats: ChatThread[];
}

interface SidebarProps {
  onSignOut: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isAnonymous?: boolean;
}

export function Sidebar({ onSignOut, isOpen, setIsOpen, isAnonymous }: SidebarProps) {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState("trajectory");
  const [touchStart, setTouchStart] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [historyData, setHistoryData] = useState<HistoryGroup[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeChatMenu, setActiveChatMenu] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Operator");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || "Operator";
        setUserName(name);
      }
    };
    fetchUser();
  }, []);

  // Close menu on click outside
  useEffect(() => {
    const handleClick = () => setActiveChatMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const deleteChat = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Optimistic UI update for instant feedback
    setHistoryData(prev => 
      prev.map(group => ({
        ...group,
        chats: group.chats.filter((c: ChatThread) => c.id !== threadId)
      })).filter(group => group.chats.length > 0)
    );
    setActiveChatMenu(null);

    try {
const { data: { session } } = await supabase.auth.getSession();
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      await fetch(`${baseUrl}/api/v1/threads/${threadId}`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${session?.access_token}` }

      });
      fetchThreads();
    } catch (err) {
      console.error("Failed to delete thread", err);
      fetchThreads(); // Revert on failure
    }
  };

  const fetchThreads = async (query?: string) => {
    if (!query) setIsLoadingHistory(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isAnonymous || !session) { setIsLoadingHistory(false); return; }
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const url = new URL(`${baseUrl}/api/v1/threads`);
        url.searchParams.append('t', String(Date.now()));
        if (query) url.searchParams.append('q', query);

      const res = await fetch(url.toString(), {
        headers: { "Authorization": `Bearer ${session?.access_token}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        // Group by 'Today', 'Yesterday', etc. based on updated_at
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);

        const grouped: HistoryGroup[] = [
          { group: "Today", chats: [] },
          { group: "Yesterday", chats: [] },
          { group: "Previous 7 Days", chats: [] },
          { group: "Older", chats: [] }
        ];

        data.data.forEach((t: ChatThread) => {
          const tDate = new Date(t.updated_at);
          if (tDate >= today) grouped[0].chats.push(t);
          else if (tDate >= yesterday) grouped[1].chats.push(t);
          else if (tDate >= last7Days) grouped[2].chats.push(t);
          else grouped[3].chats.push(t);
        });

        setHistoryData(grouped.filter(g => g.chats.length > 0));
      }
    } catch (err) {
      console.error("Failed to load threads", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    const handleRefresh = () => fetchThreads();
    window.addEventListener('refresh-sidebar', handleRefresh);
    return () => window.removeEventListener('refresh-sidebar', handleRefresh);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchThreads(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart - e.changedTouches[0].clientX > 50) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          onTouchStart={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in-up"
          style={{ animationDuration: '200ms' }}
        />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`fixed lg:relative inset-y-0 left-0 z-50 flex flex-col shrink-0 h-screen transition-all duration-300 bg-black/40 backdrop-blur-2xl lg:bg-transparent lg:backdrop-blur-none overflow-hidden ${
          isOpen ? "w-[260px] translate-x-0 opacity-100" : "w-0 -translate-x-full opacity-0"
        }`}
        style={{ height: '100dvh' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { scrollbar-width: none; }
          @keyframes sbAudioWave {
            0%, 100% { height: 4px; opacity: 0.6; }
            50% { height: 14px; opacity: 1; }
          }
          .sb-wave-1 { animation: sbAudioWave 0.9s ease-in-out infinite; }
          .sb-wave-2 { animation: sbAudioWave 0.9s ease-in-out infinite 0.15s; }
          .sb-wave-3 { animation: sbAudioWave 0.9s ease-in-out infinite 0.3s; }
          .sb-wave-4 { animation: sbAudioWave 0.9s ease-in-out infinite 0.45s; }
        `}} />

        {/* ── Top Brand Header ── */}
        <div className="p-4 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center">
              <GyroLogo size={22} className="mr-2" />
              {isOpen && (
                <span className="font-sans font-bold text-[14px] text-white tracking-[0.15em] uppercase">
                  LUMENSKY
                </span>
              )}
            </div>
          </div>

          {/* New Thread Button */}
          <button 
            onClick={() => {
              window.dispatchEvent(new Event('new-thread'));
              setIsOpen(false);
            }}
            className="flex items-center justify-center gap-2 w-full bg-white text-black font-medium py-2 px-4 rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-[13px] shrink-0"
          >
            <Plus className="size-4" />
            {isOpen && <span>New thread</span>}
          </button>
        </div>

        {/* ── Navigation Links ── */}
        <div className="px-3 shrink-0 flex flex-col gap-0.5">
          {/* Search */}
          {isOpen ? (
            isSearchActive ? (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#18181b] border-[#27272a] rounded-lg">
                <Search className="size-4 text-[#666666] shrink-0" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search chats..." 
                  className="bg-transparent border-none outline-none text-[13px] text-white w-full placeholder:text-[#666666]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => !searchQuery && setIsSearchActive(false)}
                  onKeyDown={(e) => e.key === 'Escape' && setIsSearchActive(false)}
                />
              </div>
            ) : (
              <div 
                onClick={() => setIsSearchActive(true)}
                className="flex items-center justify-between px-3 py-2 text-[#a1a1aa] hover:text-white hover:bg-white/5 rounded-lg cursor-pointer transition-colors text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="size-4 text-[#666666]" />
                  <span>Search</span>
                </div>
              </div>
            )
          ) : (
            <button 
              onClick={() => {
                setIsOpen(true);
                setIsSearchActive(true);
              }}
              className="size-10 mx-auto grid place-items-center rounded-xl text-[#a1a1aa] hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <Search className="size-4" />
            </button>
          )}

          {/* Chat History */}
          {!isAnonymous && (
            <button
              onClick={() => {
                setActiveItem("history");
                router.push("/history");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-colors ${
                activeItem === "history"
                  ? "bg-[#ffffff]/10 text-[#ffffff]"
                  : "text-[#a1a1aa] hover:bg-white/5 hover:text-[#ffffff]"
              } ${!isOpen ? "justify-center" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Clock className="size-4 shrink-0" />
                {isOpen && <span className="font-medium">Chat History</span>}
              </div>
            </button>
          )}

        </div>

        {/* ── Scrollable History List ── */}
        <div className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          {isOpen && (
            <>
              {/* History List — only last 7 days */}
              {isLoadingHistory ? (
                <SidebarHistorySkeleton />
              ) : (() => {
                // Only show Today, Yesterday, Previous 7 Days — NOT "Older"
                const RECENT_GROUPS = ["Today", "Yesterday", "Previous 7 Days"];
                const filteredHistory = historyData
                  .filter(g => RECENT_GROUPS.includes(g.group))
                  .map(g => ({
                    ...g,
                    chats: g.chats.filter((c: ChatThread) => c?.title?.toLowerCase().includes(searchQuery.toLowerCase()))
                  })).filter(g => g.chats.length > 0);

                if (filteredHistory.length === 0) {
                  return (
                    <div className="px-3 py-4 text-center text-[#666666] text-[13px]">
                      No recent chats.
                    </div>
                  );
                }

                return filteredHistory.map((group, i) => (
                  <div key={i} className="space-y-1">
                    <div className="text-[10px] font-semibold text-[#666666] tracking-wider uppercase px-3 mb-1">
                      {group.group}
                    </div>
                    {group.chats.map((chat: ChatThread) => (
                      <div key={chat.id} className="group relative">
                        <button 
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('load-thread', { detail: { threadId: chat.id } }));
                            if (window.innerWidth < 768) setIsOpen(false);
                          }}
                          className="w-full text-left py-1.5 px-3 pr-8 rounded-lg text-[#a1a1aa] hover:text-white transition-colors text-[13px] truncate cursor-pointer block"
                        >
                          {chat.title?.replace(/^\[Sent:.*?\]\s*/i, '') || 'New Chat'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChatMenu(activeChatMenu === chat.id ? null : chat.id);
                          }}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 text-white hover:text-white transition-opacity rounded-md cursor-pointer
                            opacity-100 md:opacity-0 md:group-hover:opacity-100 ${activeChatMenu === chat.id ? 'md:opacity-100' : ''}
                          `}
                        >
                          <MoreVertical className="size-3.5" />
                        </button>
                        {activeChatMenu === chat.id && (
                          <div className="absolute right-2 top-8 z-50 w-32 bg-[#18181b] border-[#27272a] rounded-lg shadow-xl overflow-hidden animate-message-reveal">
                            <button
                              onClick={(e) => deleteChat(chat.id, e)}
                              className="flex items-center gap-2 w-full text-left px-3 py-2 text-[12px] text-[#ff3333] hover:bg-[#ff3333]/10 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </>
          )}
        </div>

        {/* ── Footer / Upgrade / Profile ── */}
        <div className="p-3 bg-transparent shrink-0 flex flex-col gap-3">
          
          {/* User profile row */}
          <div className="relative">
            {isSignOutOpen && isOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-full bg-[#000000] border-[#18181b] rounded-xl p-1.5 shadow-2xl animate-message-reveal z-50">
                {isDeletingAccount ? (
                  <div className="flex flex-col gap-2 p-1">
                    <span className="text-[12px] font-medium text-white mb-1 text-center leading-snug">Are you absolutely sure you want to delete your account?</span>
                    <button 
                      onClick={() => {
                        onSignOut(); // In a real app, hit DELETE /user endpoint first
                      }}
                      className="flex items-center justify-center w-full py-2 text-black bg-[#ff3333] hover:bg-[#ff1a1a] font-semibold text-[11px] rounded transition-colors cursor-pointer uppercase tracking-wider shadow-[0_0_15px_rgba(255,51,51,0.3)]"
                    >
                      Yes, Delete
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeletingAccount(false);
                      }}
                      className="flex items-center justify-center w-full py-1.5 text-[#a1a1aa] hover:bg-white/5 hover:text-white font-medium text-[12px] rounded transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const isLight = document.documentElement.classList.toggle('light-theme');
                        localStorage.setItem('fp_theme', isLight ? 'light' : 'dark');
                        setIsSignOutOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 text-[#e4e4e7] hover:bg-white/5 font-medium text-[13px] rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-[2px] w-[14px] h-[14px] justify-center mr-0.5">
                        <div className="w-[2px] h-[4px] bg-white rounded-full sb-wave-1"></div>
                        <div className="w-[2px] h-[4px] bg-white rounded-full sb-wave-2"></div>
                        <div className="w-[2px] h-[4px] bg-white rounded-full sb-wave-3"></div>
                        <div className="w-[2px] h-[4px] bg-white rounded-full sb-wave-4"></div>
                      </div>
                      Toggle Theme
                    </button>
                    <button 
                      onClick={onSignOut}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 text-[#e4e4e7] hover:bg-white/5 font-medium text-[13px] rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5 text-[#a1a1aa]" />
                      Sign out
                    </button>
                    <div className="h-px bg-[#18181b] my-0.5 mx-1" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeletingAccount(true);
                      }}
                      className="flex items-center gap-2.5 w-full px-2.5 py-2 text-[#eab308] hover:bg-[#eab308]/10 font-medium text-[13px] rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      Delete my account
                    </button>
                  </div>
                )}
              </div>
            )}
            <button 
              onClick={() => setIsSignOutOpen(!isSignOutOpen)}
              className="flex items-center justify-between w-full p-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Profile letter avatar */}
                <div className="size-7 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-white text-transform uppercase">{isAnonymous ? 'A' : userName.charAt(0)}</span>
                </div>
                {isOpen && (
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="font-sans text-[12px] text-white font-semibold truncate leading-tight">
                      {isAnonymous ? "Anonymous Guest" : userName}
                    </span>
                    <span className="font-sans text-[10px] text-[#666666] mt-0.5 leading-none">
                      {isAnonymous ? "Sign up to save progress" : "Free plan"}
                    </span>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
