"use client";

import { useState, useEffect } from "react";
import { Users, MessageSquare, TrendingUp, Zap, Shield, BarChart3, RefreshCw, Eye, EyeOff, ExternalLink } from "lucide-react";

const ADMIN_SECRET = "lumensky-admin-2024";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface UserRow {
  userId: string;
  goal: string;
  path: string;
  day: number;
  totalDays: number;
  streak: number;
  consistencyScore: number;
  messages: number;
  lastActive: string;
  status: "Elite" | "Active" | "At Risk";
}

interface Stats {
  totalUsers: number;
  dau: number;
  totalMessages: number;
  totalThreads: number;
  avgConsistency: number;
  totalMissions: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return `${mins}m ago`;
}

function statusColor(status: string) {
  if (status === "Elite") return "text-emerald-400 bg-emerald-400/10";
  if (status === "Active") return "text-blue-400 bg-blue-400/10";
  return "text-red-400 bg-red-400/10";
}

export default function AdminDashboard() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { "X-Admin-Secret": ADMIN_SECRET };
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/admin/stats`, { headers }),
        fetch(`${API_URL}/api/v1/admin/users`, { headers }),
      ]);
      const [statsData, usersData] = await Promise.all([statsRes.json(), usersRes.json()]);
      if (statsData.data) setStats(statsData.data);
      if (usersData.data) setUsers(usersData.data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Admin fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = () => {
    if (pwd === ADMIN_SECRET) {
      setUnlocked(true);
      fetchData();
    } else {
      setError("Wrong password. Try again.");
      setPwd("");
    }
  };

  const filteredUsers = users.filter(u =>
    u.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <Shield className="size-5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold text-sm">Lumensky</div>
              <div className="text-[#666] text-xs">B2B Operator Dashboard</div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h1 className="text-white text-xl font-bold mb-1">Access Dashboard</h1>
            <p className="text-[#666] text-sm mb-6">Enter admin password to continue</p>

            <div className="relative mb-3">
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Admin password"
                value={pwd}
                onChange={e => { setPwd(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleUnlock()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-[#555] outline-none focus:border-white/30 transition-colors pr-10"
              />
              <button
                onClick={() => setShowPwd(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <button
              onClick={handleUnlock}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-100 transition-colors"
            >
              Unlock Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <BarChart3 className="size-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Lumensky Dashboard</span>
            <span className="text-[#555] text-xs ml-2">B2B Operator View</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[#444] text-xs">
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 text-[#a1a1aa] hover:text-white text-xs border border-white/10 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5"
          >
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href="/"
            className="text-[#a1a1aa] hover:text-white text-xs border border-white/10 rounded-lg px-3 py-1.5 transition-colors hover:bg-white/5 flex items-center gap-1.5"
          >
            <ExternalLink className="size-3" /> App
          </a>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
              { label: "DAU (24h)", value: stats.dau, icon: Zap, color: "text-yellow-400" },
              { label: "Messages", value: stats.totalMessages.toLocaleString(), icon: MessageSquare, color: "text-purple-400" },
              { label: "Threads", value: stats.totalThreads.toLocaleString(), icon: TrendingUp, color: "text-emerald-400" },
              { label: "Avg Consistency", value: `${stats.avgConsistency}%`, icon: BarChart3, color: "text-orange-400" },
              { label: "Active Missions", value: stats.totalMissions, icon: Shield, color: "text-pink-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`size-3.5 ${color}`} />
                  <span className="text-[#666] text-[11px] font-medium">{label}</span>
                </div>
                <div className="text-white text-xl font-bold">{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white/[0.02] border border-white/[0.07] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-sm">All Users</h2>
              <p className="text-[#555] text-xs mt-0.5">{filteredUsers.length} operators tracked</p>
            </div>
            <input
              type="text"
              placeholder="Search by goal, ID, status..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder:text-[#444] outline-none focus:border-white/20 w-52 transition-colors"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-[#555] text-sm">
              <RefreshCw className="size-4 animate-spin mr-2" /> Loading data...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[#555] text-sm">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left border-b border-white/[0.05]">
                    {["User ID", "Goal / Mission", "Status", "Day", "Streak", "Consistency", "Messages", "Last Active"].map(h => (
                      <th key={h} className="px-5 py-3 text-[#555] font-medium text-[11px] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, i) => (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-[#666]">
                        {user.userId.substring(0, 8)}…
                      </td>
                      <td className="px-5 py-3.5 text-white font-medium max-w-[200px] truncate">
                        {user.goal}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#a1a1aa]">
                        {user.day}/{user.totalDays}
                      </td>
                      <td className="px-5 py-3.5 text-[#a1a1aa]">
                        🔥 {user.streak}d
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden w-16">
                            <div
                              className={`h-full rounded-full ${
                                user.consistencyScore >= 70 ? "bg-emerald-400" :
                                user.consistencyScore >= 40 ? "bg-blue-400" : "bg-red-400"
                              }`}
                              style={{ width: `${Math.max(user.consistencyScore, 0)}%` }}
                            />
                          </div>
                          <span className="text-[#a1a1aa] text-[11px] w-8">
                            {user.consistencyScore >= 0 ? `${user.consistencyScore}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#a1a1aa]">{user.messages}</td>
                      <td className="px-5 py-3.5 text-[#555] text-[11px]">
                        {timeAgo(user.lastActive)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[#333] text-xs pb-4">
          Lumensky B2B Dashboard · Confidential
        </div>
      </div>
    </div>
  );
}
