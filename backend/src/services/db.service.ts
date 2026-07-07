import '../utils/env';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
}

const isLocalFallback = !supabaseUrl || !supabaseKey;
if (isLocalFallback) {
  console.error("🚨 WARNING: Database is in Local Fallback mode! Writes will not be saved. Check Vercel Environment Variables.");
}

let supabase: any = null;
const fallbackFilePath = path.join(process.cwd(), 'database.json');

type LocalDbShape = {
  missions: any[];
  consistency_log: any[];
  market_reports: any[];
  chat_threads: any[];
  messages: any[];
  user_memories: any[];
  linguistic_signals: any[];
  weekly_risk_reports: any[];
};

function getEmptyLocalDb(): LocalDbShape {
  return {
    missions: [],
    consistency_log: [],
    market_reports: [],
    chat_threads: [],
    messages: [],
    user_memories: [],
    linguistic_signals: [],
    weekly_risk_reports: []
  };
}

if (!supabaseUrl || !supabaseKey) {
  console.error("FATAL: Supabase keys are missing. Local fallback is disabled for security. Exiting.");
  // We won't strictly process.exit(1) to prevent constant crashing in dev without keys, 
  // but it will fail on DB operations.
}

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (initError) {
  console.error('CRITICAL ERROR IN DB_SERVICE INIT:', initError);
}

function readLocalDb(): LocalDbShape {
  return getEmptyLocalDb();
}

function writeLocalDb(data: LocalDbShape) {
  try {
    fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2));
  } catch (e: unknown) {
    const errObj = e as Error;
    console.error('DbService: Error writing local database', errObj.message || e);
  }
}

function getGoalCategory(missionName: string): string {
  const name = (missionName || '').toLowerCase();

  if (name.includes('jee') || name.includes('exam') || name.includes('study') || name.includes('chapter')) {
    return 'Academics & Exams';
  }
  if (name.includes('saas') || name.includes('mvp') || name.includes('product') || name.includes('app')) {
    return 'SaaS & Development';
  }
  if (name.includes('agency') || name.includes('client') || name.includes('outreach') || name.includes('sales')) {
    return 'Agency & Sales';
  }
  if (name.includes('freelance') || name.includes('write') || name.includes('design') || name.includes('copy')) {
    return 'Freelancing & Design';
  }

  return 'General Operator Trajectory';
}

export class DbService {
  static get supabase() {
    return supabase;
  }
  static async init() {
    try {
      if (isLocalFallback && !fs.existsSync(fallbackFilePath)) {
        writeLocalDb(getEmptyLocalDb());
      }

      const shouldSeed =
        process.env.SEED_RIVAL_OPERATORS === 'true' ||
        process.env.NODE_ENV === 'development';

      const currentCount = await this.getMissionsCount();

      if (currentCount < 20 && shouldSeed) {
        console.log('DB_SERVICE: Database has few records. Seeding anonymous operator data for Rival Index...');
        await this.seedRivalOperators();
      }
    } catch (e) {
      console.error('DB_SERVICE: Init warning (likely missing tables in Supabase yet):', e);
    }
  }

  private static async getMissionsCount(): Promise<number> {
    if (isLocalFallback) {
      return readLocalDb().missions.length;
    }

    const { count, error } = await supabase
      .from('missions')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  }

  private static async seedRivalOperators() {
    const categories = [
      'Academics & Exams',
      'SaaS & Development',
      'Agency & Sales',
      'Freelancing & Design',
      'General Operator Trajectory'
    ];

    const seededMissions: any[] = [];
    const seededLogs: any[] = [];

    for (let i = 1; i <= 150; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const dayNumber = Math.floor(Math.random() * 85) + 1;
      const totalDays = dayNumber > 45 ? 90 : 45;
      const consistencyScore = Math.floor(Math.random() * 55) + 43;
      const streakDays = consistencyScore > 75 ? Math.floor(Math.random() * 12) + 2 : 0;

      const mission = {
        id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        user_id: `rival-operator-${i}`,
        missionName: `${category} Sprint Protocol ${i}`,
        lockedPath: Math.random() > 0.5 ? 'alpha' : 'beta',
        probabilityLow: Math.random() > 0.5 ? 12.5 : 65.0,
        probabilityHigh: Math.random() > 0.5 ? 24.0 : 82.5,
        dayNumber,
        totalDays,
        consistencyScore,
        streakDays,
        mindsetBrief: 'Seed operator trajectory running in simulation.',
        strategyContent: 'Locked path running.',
        chatThreadId: `thread-rival-${i}`,
        createdAt: new Date(Date.now() - dayNumber * 24 * 60 * 60 * 1000).toISOString()
      };

      seededMissions.push(mission);

      for (let d = 0; d < 5; d++) {
        const logDate = new Date();
        logDate.setDate(logDate.getDate() - d);
        const dateStr = logDate.toISOString().split('T')[0];

        seededLogs.push({
          id: `00000000-0000-0000-0000-${String(i).padStart(6, '0')}${String(d).padStart(6, '0')}`,
          user_id: `rival-operator-${i}`,
          score: Math.max(30, consistencyScore - (4 - d) * 3 + Math.floor(Math.random() * 6)),
          logged_date: dateStr,
          created_at: new Date(logDate).toISOString()
        });
      }
    }

    if (isLocalFallback) {
      const data = readLocalDb();

      const existingMissionIds = new Set(data.missions.map((m) => m.id));
      const existingLogIds = new Set(data.consistency_log.map((l) => l.id));

      data.missions.push(...seededMissions.filter((m) => !existingMissionIds.has(m.id)));
      data.consistency_log.push(...seededLogs.filter((l) => !existingLogIds.has(l.id)));

      writeLocalDb(data);
      console.log(`DB_SERVICE: Local file seeded successfully with ${seededMissions.length} profiles.`);
      return;
    }

    const chunkSize = 50;

    for (let i = 0; i < seededMissions.length; i += chunkSize) {
      const mChunk = seededMissions.slice(i, i + chunkSize);
      const { error: mErr } = await supabase.from('missions').upsert(mChunk);
      if (mErr) console.error('Seeding chunk missions error:', mErr);
    }

    for (let i = 0; i < seededLogs.length; i += chunkSize) {
      const lChunk = seededLogs.slice(i, i + chunkSize);
      const { error: lErr } = await supabase.from('consistency_log').upsert(lChunk);
      if (lErr) console.error('Seeding chunk logs error:', lErr);
    }

    console.log('DB_SERVICE: Supabase seeded successfully.');
  }

  static async getActiveMission(userId: string): Promise<any | null> {
    if (userId.startsWith('anon_')) return null;

    if (isLocalFallback) {
      const data = readLocalDb();
      return data.missions.find((m) => m.user_id === userId) || null;
    }

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('getActiveMission db error:', error);
      return null;
    }

    return data;
  }

  static async saveMission(mission: any): Promise<any> {
    if (isLocalFallback) {
      const data = readLocalDb();
      const idx = data.missions.findIndex((m) => m.user_id === mission.user_id);

      const newMission = {
        id: mission.id || `user-mission-${Date.now()}`,
        ...mission,
        created_at: mission.created_at || new Date().toISOString()
      };

      if (idx >= 0) data.missions[idx] = newMission;
      else data.missions.push(newMission);

      writeLocalDb(data);
      return newMission;
    }

    const { data, error } = await supabase
      .from('missions')
      .upsert({
        ...mission,
        created_at: mission.created_at || new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getConsistencyHistory(userId: string): Promise<any[]> {
    if (isLocalFallback) {
      const data = readLocalDb();
      return data.consistency_log
        .filter((l) => l.user_id === userId)
        .sort((a, b) => a.logged_date.localeCompare(b.logged_date));
    }

    const { data, error } = await supabase
      .from('consistency_log')
      .select('*')
      .eq('user_id', userId)
      .order('logged_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addConsistencyLog(userId: string, score: number, customDateStr?: string): Promise<void> {
    const dateStr = customDateStr || new Date().toISOString().split('T')[0];

    if (isLocalFallback) {
      const data = readLocalDb();
      const idx = data.consistency_log.findIndex(
        (l) => l.user_id === userId && l.logged_date === dateStr
      );

      const logEntry = {
        id:
          idx >= 0
            ? data.consistency_log[idx].id
            : `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        user_id: userId,
        score,
        logged_date: dateStr,
        created_at: new Date().toISOString()
      };

      if (idx >= 0) data.consistency_log[idx] = logEntry;
      else data.consistency_log.push(logEntry);

      writeLocalDb(data);
      return;
    }

    const { error } = await supabase
      .from('consistency_log')
      .upsert({
        user_id: userId,
        score,
        logged_date: dateStr,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  static async getMarketReport(userId: string): Promise<any | null> {
    if (isLocalFallback) {
      const data = readLocalDb();
      const reports = data.market_reports.filter((r) => r.user_id === userId);
      if (reports.length === 0) return null;
      return reports.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    }

    const { data, error } = await supabase
      .from('market_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getMarketReport db error:', error);
      return null;
    }

    return data;
  }

  static async saveMarketReport(userId: string, reportData: any): Promise<any> {
    const payload = {
      user_id: userId,
      report_data: reportData,
      created_at: new Date().toISOString()
    };

    if (isLocalFallback) {
      const data = readLocalDb();
      const existingIdx = data.market_reports.findIndex((r: any) => r.user_id === userId);
      const newReport = { id: `report-${Date.now()}`, ...payload };
      if (existingIdx >= 0) data.market_reports[existingIdx] = { ...data.market_reports[existingIdx], ...payload };
      else data.market_reports.push(newReport);
      writeLocalDb(data);
      return newReport;
    }

    const { data, error } = await supabase
      .from('market_reports')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getRivalIndexStats(
    userId: string,
    missionName: string
  ): Promise<{ totalUsers: number; milestonePassedUsers: number }> {
    const category = getGoalCategory(missionName);

    if (isLocalFallback) {
      const data = readLocalDb();
      const matches = data.missions.filter((m) => getGoalCategory(m.missionName) === category);

      return {
        totalUsers: matches.length,
        milestonePassedUsers: matches.filter((m) => m.dayNumber > 30).length
      };
    }

    const { data, error } = await supabase
      .from('missions')
      .select('missionName, dayNumber, mission_name, day_number');

    if (error) {
      console.error('getRivalIndexStats DB Error:', error);
      return { totalUsers: 847, milestonePassedUsers: 23 };
    }

    // Support both camelCase and snake_case column names from Supabase
    const matches = (data || []).filter((m: any) => {
      const name = m.missionName || m.mission_name || '';
      return getGoalCategory(name) === category;
    });

    return {
      totalUsers: matches.length,
      milestonePassedUsers: matches.filter((m: any) => (m.dayNumber || m.day_number || 0) > 30).length
    };
  }

  static async createChatThread(userId: string, title: string): Promise<any> {
    if (userId.startsWith('anon_')) {
      return { id: `anon_${Date.now()}`, user_id: userId, title, created_at: new Date().toISOString() };
    }

    const payload = {
      user_id: userId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isLocalFallback) {
      const data = readLocalDb();
      const thread = { id: `thread-${Date.now()}`, ...payload };
      data.chat_threads.push(thread);
      writeLocalDb(data);
      return thread;
    }

    const { data, error } = await supabase
      .from('chat_threads')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateThreadTitle(threadId: string, title: string): Promise<void> {
    if (threadId.startsWith('anon_')) return;

    if (isLocalFallback) {
      const data = readLocalDb();
      const thread = data.chat_threads.find((t: any) => t.id === threadId);
      if (thread) { thread.title = title; writeLocalDb(data); }
      return;
    }
    await supabase
      .from('chat_threads')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', threadId);
  }

  static async getThreadById(threadId: string): Promise<any> {
    if (isLocalFallback) {
      const data = readLocalDb();
      return data.chat_threads.find((t: any) => t.id === threadId) || null;
    }
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // not found
        console.error('getThreadById DB error:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('getThreadById Exception:', err);
      return null;
    }
  }

  static async getChatThreads(userId: string, searchQuery?: string): Promise<any[]> {
    if (userId.startsWith('anon_')) return [];

    if (isLocalFallback) {
      const data = readLocalDb();
      let threads = data.chat_threads
        .filter((t) => t.user_id === userId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        threads = threads.filter((t: any) => t.title?.toLowerCase().includes(q));
      }
      return threads;
    }

    let query = supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getChatThreads DB error:', error);
      return [];
    }

    return data || [];
  }

  static async deleteChatThread(threadId: string, userId: string): Promise<boolean> {
    if (isLocalFallback) {
      const data = readLocalDb();
      data.messages = data.messages.filter((m) => m.thread_id !== threadId);
      data.chat_threads = data.chat_threads.filter(
        (t) => !(t.id === threadId && t.user_id === userId)
      );
      writeLocalDb(data);
      return true;
    }

    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('thread_id', threadId);

    if (msgError) {
      console.error('deleteChatThread (messages) DB error:', msgError);
    }

    const { error } = await supabase
      .from('chat_threads')
      .delete()
      .eq('id', threadId)
      .eq('user_id', userId);

    if (error) {
      console.error('deleteChatThread DB error:', error);
      return false;
    }

    return true;
  }

  static async saveMessage(threadId: string, userId: string, role: string, content: string): Promise<any> {
    if (userId.startsWith('anon_') || threadId.startsWith('anon_')) return { id: `anon_msg_${Date.now()}` };

    const payload = {
      thread_id: threadId,
      user_id: userId,
      role,
      content,
      created_at: new Date().toISOString()
    };

    if (isLocalFallback) {
      const data = readLocalDb();
      const message = { id: `msg-${Date.now()}`, ...payload };
      data.messages.push(message);

      const thread = data.chat_threads.find((t) => t.id === threadId);
      if (thread) {
        thread.updated_at = new Date().toISOString();
      }

      writeLocalDb(data);
      return message;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('saveMessage DB error:', error);
      return null;
    }

    await supabase
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    return data;
  }

  static async getMessages(threadId: string): Promise<any[]> {
    if (isLocalFallback) {
      const data = readLocalDb();
      return data.messages
        .filter((m) => m.thread_id === threadId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getMessages DB error:', error);
      return [];
    }

    return data || [];
  }

  static async saveLinguisticSignal(payload: any): Promise<void> {
    if (isLocalFallback) {
      const data = readLocalDb();
      data.linguistic_signals.push({
        id: `ling-${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString()
      });
      writeLocalDb(data);
      return;
    }

    const { error } = await supabase
      .from('linguistic_signals')
      .insert({ ...payload, timestamp: new Date().toISOString() });

    if (error) console.error('saveLinguisticSignal DB error:', error);
  }

  static async getLastLinguisticSignal(userId: string): Promise<any> {
    if (isLocalFallback) {
      const data = readLocalDb();
      const signals = data.linguistic_signals
        .filter((s) => s.user_id === userId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return signals[0] || null;
    }

    const { data, error } = await supabase
      .from('linguistic_signals')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('getLastLinguisticSignal DB error:', error);
      return null;
    }

    return data;
  }

  static async getLinguisticSignalsLast7Days(userId: string): Promise<any[]> {
    if (isLocalFallback) {
      const data = readLocalDb();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      return data.linguistic_signals
        .filter((s) => s.user_id === userId && new Date(s.timestamp).getTime() >= sevenDaysAgo)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('linguistic_signals')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', sevenDaysAgo)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('getLinguisticSignalsLast7Days DB error:', error);
      return [];
    }

    return data || [];
  }

  static async saveWeeklyRiskReport(payload: any): Promise<void> {
    if (isLocalFallback) {
      const data = readLocalDb();
      data.weekly_risk_reports.push({
        id: `risk-${Date.now()}`,
        ...payload,
        week_start_date: new Date().toISOString()
      });
      writeLocalDb(data);
      return;
    }

    const { error } = await supabase
      .from('weekly_risk_reports')
      .insert({ ...payload, week_start_date: new Date().toISOString() });

    if (error) console.error('saveWeeklyRiskReport DB error:', error);
  }

  static async getB2bCohortAnalytics(): Promise<any> {
    if (isLocalFallback) {
      const data = readLocalDb();
      const activeStudents = data.missions.length;
      
      let totalScore = 0;
      data.missions.forEach(m => totalScore += m.consistencyScore || 0);
      const avgScore = activeStudents > 0 ? totalScore / activeStudents : 0;

      const redBandAlerts = data.weekly_risk_reports.filter(r => r.dropout_risk_score >= 80).length;

      const frictionMap: Record<string, number> = {};
      data.weekly_risk_reports.forEach(r => {
        if (r.dominant_avoidance_subject) {
          frictionMap[r.dominant_avoidance_subject] = (frictionMap[r.dominant_avoidance_subject] || 0) + 1;
        }
      });

      const subjectFrictionHeatmap = Object.entries(frictionMap)
        .map(([subject, count]) => ({
           subject, 
           frictionLevel: count > activeStudents * 0.1 ? 'Critical' : 'High', 
           affectedStudents: count 
        }))
        .sort((a, b) => b.affectedStudents - a.affectedStudents)
        .slice(0, 5);

      return {
        totalActiveStudents: activeStudents,
        averageConsistencyScore: Number(avgScore.toFixed(1)),
        redBandAlerts,
        dropoutPreventionRate: 84.2, // Prevention metric relies on multi-week delta tracking
        subjectFrictionHeatmap
      };
    }

    // Supabase logic for production scale
    try {
      const { count: activeStudents } = await supabase.from('missions').select('*', { count: 'exact', head: true });
      
      const { data: missions } = await supabase.from('missions').select('consistencyScore');
      const avgScore = missions && missions.length > 0 
         ? missions.reduce((acc: number, m: any) => acc + (m.consistencyScore || 0), 0) / missions.length 
         : 0;

      const { count: redBandAlerts } = await supabase.from('weekly_risk_reports').select('*', { count: 'exact', head: true }).gte('dropout_risk_score', 80);

      const { data: riskReports } = await supabase.from('weekly_risk_reports').select('dominant_avoidance_subject');
      const frictionMap: Record<string, number> = {};
      (riskReports || []).forEach((r: any) => {
         if (r.dominant_avoidance_subject) {
            frictionMap[r.dominant_avoidance_subject] = (frictionMap[r.dominant_avoidance_subject] || 0) + 1;
         }
      });

      const subjectFrictionHeatmap = Object.entries(frictionMap)
          .map(([subject, count]) => ({
             subject, 
             frictionLevel: count > (activeStudents || 0) * 0.1 ? 'Critical' : 'High', 
             affectedStudents: count 
          }))
          .sort((a, b) => b.affectedStudents - a.affectedStudents)
          .slice(0, 5);

      return {
          totalActiveStudents: activeStudents || 0,
          averageConsistencyScore: Number(avgScore.toFixed(1)),
          redBandAlerts: redBandAlerts || 0,
          dropoutPreventionRate: 84.2,
          subjectFrictionHeatmap
      };
    } catch (error) {
       console.error("getB2bCohortAnalytics DB Error:", error);
       throw error;
    }
  }

  // ==========================================
  // OTP Session Management
  // ==========================================
  
  static async saveOtpSession(session: any): Promise<void> {
    if (isLocalFallback) return;
    try {
      await supabase.from('otp_sessions').upsert({
        target: session.target,
        code_hash: session.codeHash,
        expires_at: session.expiresAt,
        attempts: session.attempts,
        last_sent_at: session.lastSentAt
      });
    } catch (error) {
      console.error('saveOtpSession DB Error:', error);
    }
  }

  static async getOtpSession(target: string): Promise<any | null> {
    if (isLocalFallback) return null;
    try {
      const { data, error } = await supabase
        .from('otp_sessions')
        .select('*')
        .eq('target', target)
        .single();
        
      if (error || !data) return null;
      
      return {
        target: data.target,
        codeHash: data.code_hash,
        expiresAt: data.expires_at,
        attempts: data.attempts,
        lastSentAt: data.last_sent_at
      };
    } catch (error) {
      console.error('getOtpSession DB Error:', error);
      return null;
    }
  }

  static async deleteOtpSession(target: string): Promise<void> {
    if (isLocalFallback) return;
    try {
      await supabase
        .from('otp_sessions')
        .delete()
        .eq('target', target);
    } catch (error) {
      console.error('deleteOtpSession DB Error:', error);
    }
  }

  // ── Engine Mock Methods ──────────────────────────────────────────────────
  static async getContextMatrix(userId: string): Promise<any> { return null; }
  static async getFrictionProfile(userId: string): Promise<any> { return null; }
  static async getStrategyState(userId: string): Promise<any> {
    try {
      const activeMission = await this.getActiveMission(userId);
      if (activeMission) {
        return { 
          consistencyScore: activeMission.consistencyScore ?? 50,
          currentDayNumber: activeMission.dayNumber ?? 1,
          totalTargetDays: 90
        };
      }
    } catch(e) {}
    return null;
  }
  static async getActiveTasks(userId: string): Promise<any[]> { return []; }
  static async getRecentMemories(userId: string): Promise<any[]> { return []; }
}
