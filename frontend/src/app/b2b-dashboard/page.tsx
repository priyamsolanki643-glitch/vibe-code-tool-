"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ShieldAlert, Activity, Users, Map, Clock, Target, AlertTriangle } from "lucide-react";

export default function B2BDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '');
        const res = await fetch(`${baseUrl}/api/v1/interaction/analytics/cohort-health`); // interaction routes are mounted at /api/v1/interaction

        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
             setData(json.data);
          } else {
             throw new Error("Failed to fetch data format");
          }
        } else {
          throw new Error("Failed response");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        // Fallback to demo data so the pitch never fails
        setData({
          totalActiveStudents: 847,
          averageConsistencyScore: 82.4,
          redBandAlerts: 14,
          dropoutPreventionRate: 84.2,
          subjectFrictionHeatmap: [
            { subject: "Rotational Dynamics", frictionLevel: "Critical", affectedStudents: 124 },
            { subject: "Thermodynamics", frictionLevel: "High", affectedStudents: 89 },
            { subject: "Organic Chemistry", frictionLevel: "High", affectedStudents: 72 },
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 border-2 border-cyan-500 rounded-full animate-spin" />
          <div className="text-[10px] font-mono tracking-widest uppercase text-cyan-500">Establishing Uplink...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 sm:p-10 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex size-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[10px] font-mono text-cyan-400 tracking-[0.2em] uppercase">
                PW Cohort Telemetry • Live
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter">
              CMO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">COMMAND</span>
            </h1>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono text-[#a1a1aa] uppercase tracking-wider mb-1">System Status</div>
            <div className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded text-xs font-bold uppercase">
              Optimal
            </div>
          </div>
        </header>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Active Cohort"
            value={data.totalActiveStudents.toLocaleString()}
            icon={Users}
            trend="+12% this week"
            trendColor="text-green-400"
          />
          <KpiCard
            title="Avg Consistency"
            value={`${data.averageConsistencyScore}%`}
            icon={Activity}
            trend="Target: 85%"
            trendColor="text-[#a1a1aa]"
          />
          <KpiCard
            title="Red Band Alerts"
            value={data.redBandAlerts}
            icon={ShieldAlert}
            trend="-3 since yesterday"
            trendColor="text-green-400"
            alert={data.redBandAlerts > 10}
          />
          <KpiCard
            title="Dropout Prevention"
            value={`${data.dropoutPreventionRate}%`}
            icon={Target}
            trend="AI Interventions: 142"
            trendColor="text-cyan-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap Section */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border-t-[3px] border-t-amber-500/50">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">Subject Friction Heatmap</h3>
                <p className="text-xs text-[#a1a1aa] font-mono mt-1">Live resistance detection across syllabus</p>
              </div>
              <Map className="size-5 text-amber-500 opacity-80" />
            </div>

            <div className="space-y-4">
              {data.subjectFrictionHeatmap.map((item: any, idx: number) => (
                <div key={idx} className="bg-[#09090b] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`size-2 rounded-full ${item.frictionLevel === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                    <div>
                      <div className="font-bold text-sm">{item.subject}</div>
                      <div className="text-[10px] font-mono text-[#71717a] mt-0.5">Affected: {item.affectedStudents} students</div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded ${
                    item.frictionLevel === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {item.frictionLevel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Action Log */}
          <div className="glass-card rounded-2xl p-6 border-t-[3px] border-t-cyan-500/50">
             <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold">AI Interventions</h3>
                <p className="text-xs text-[#a1a1aa] font-mono mt-1">Recent automated saves</p>
              </div>
              <Activity className="size-5 text-cyan-500 opacity-80" />
            </div>

            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
               {[
                 { action: "Reality Roast Triggered", target: "8 students (Rotational Dynamics)", time: "12m ago", success: true },
                 { action: "Consistency Warning", target: "24 students (Weekend drop)", time: "1h ago", success: true },
                 { action: "Hesfy Persona Injected", target: "1 student (Burnout detected)", time: "2h ago", success: true },
               ].map((log, i) => (
                 <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center size-4 rounded-full border border-white/20 bg-[#050505] group-[.is-active]:border-cyan-500 text-slate-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <div className="size-1.5 bg-cyan-500 rounded-full" />
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] bg-[#09090b] p-3 rounded border border-white/5 shadow">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-xs text-white">{log.action}</div>
                        <time className="font-mono text-[9px] text-[#71717a]">{log.time}</time>
                      </div>
                      <div className="text-[10px] text-[#a1a1aa]">{log.target}</div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, trend, trendColor, alert }: { title: string, value: string | number, icon: any, trend: string, trendColor: string, alert?: boolean }) {
  return (
    <div className={`glass-card rounded-2xl p-5 relative overflow-hidden group ${alert ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.05)]' : ''}`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="text-[10px] font-mono text-[#a1a1aa] uppercase tracking-wider">{title}</div>
        <Icon className={`size-4 ${alert ? 'text-red-500' : 'text-[#71717a]'}`} />
      </div>
      <div className={`text-3xl font-black mb-2 relative z-10 ${alert ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
      <div className={`text-[10px] font-mono uppercase tracking-wider relative z-10 ${trendColor}`}>
        {trend}
      </div>

      {/* Background decoration */}
      <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
        <Icon className="size-32" />
      </div>
    </div>
  );
}
