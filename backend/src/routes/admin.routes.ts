import { Hono } from 'hono';
import { DbService } from '../services/db.service';

export const adminRoutes = new Hono();

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'lumensky-admin-2024';

// Simple secret-key auth for admin routes
adminRoutes.use('*', async (c, next) => {
  const secret = c.req.header('X-Admin-Secret') || c.req.query('secret');
  if (secret !== ADMIN_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

// GET /api/v1/admin/stats — overall platform stats
adminRoutes.get('/stats', async (c) => {
  try {
    const supabase = (DbService as any).supabase;
    if (!supabase) return c.json({ error: 'DB not available' }, 503);

    const [usersRes, missionsRes, messagesRes, threadsRes] = await Promise.all([
      supabase.from('missions').select('user_id', { count: 'exact', head: false }),
      supabase.from('missions').select('*').order('created_at', { ascending: false }),
      supabase.from('messages').select('id', { count: 'exact', head: true }),
      supabase.from('chat_threads').select('id', { count: 'exact', head: true }),
    ]);

    const uniqueUsers = new Set((usersRes.data || []).map((r: any) => r.user_id)).size;
    const totalMessages = messagesRes.count || 0;
    const totalThreads = threadsRes.count || 0;
    const missions = missionsRes.data || [];

    // DAU: users who have messages in last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dauRes = await supabase
      .from('messages')
      .select('user_id')
      .gte('created_at', yesterday);
    const dau = new Set((dauRes.data || []).map((r: any) => r.user_id)).size;

    // Average consistency score
    const withScore = missions.filter((m: any) => m.consistency_score > 0);
    const avgConsistency = withScore.length
      ? Math.round(withScore.reduce((s: number, m: any) => s + m.consistency_score, 0) / withScore.length)
      : 0;

    return c.json({
      status: 'success',
      data: {
        totalUsers: uniqueUsers,
        dau,
        totalMessages,
        totalThreads,
        avgConsistency,
        totalMissions: missions.length,
      }
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// GET /api/v1/admin/users — all users with their mission data
adminRoutes.get('/users', async (c) => {
  try {
    const supabase = (DbService as any).supabase;
    if (!supabase) return c.json({ error: 'DB not available' }, 503);

    const { data: missions, error } = await supabase
      .from('missions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Get message counts per user
    const { data: messageCounts } = await supabase
      .from('messages')
      .select('user_id');

    const msgCountMap: Record<string, number> = {};
    (messageCounts || []).forEach((m: any) => {
      msgCountMap[m.user_id] = (msgCountMap[m.user_id] || 0) + 1;
    });

    const users = (missions || []).map((m: any) => ({
      userId: m.user_id,
      goal: m.mission_name || 'No goal set',
      path: m.locked_path || 'Not locked',
      day: m.day_number || 0,
      totalDays: m.total_days || 90,
      streak: m.streak_days || 0,
      consistencyScore: m.consistency_score ?? -1,
      messages: msgCountMap[m.user_id] || 0,
      lastActive: m.updated_at,
      status: m.consistency_score >= 70 ? 'Elite' : m.consistency_score >= 40 ? 'Active' : 'At Risk',
    }));

    return c.json({ status: 'success', data: users });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
