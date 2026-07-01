import './utils/env';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { interactionRoutes } from './routes/interaction.routes';
import { streamRoutes } from './routes/stream.routes';
import { authRoutes } from './routes/auth.routes';
import { threadRoutes } from './routes/thread.routes';
import { oracleRoutes } from './routes/oracle.routes';
import { adminRoutes } from './routes/admin.routes';
import { DbService } from './services/db.service';
import { VectorService } from './services/vector.service';
import { WebSocketService } from './services/websocket.service';
import { requireIdempotency } from './middleware/idempotency.middleware';

const app = new Hono();

// Global crash handlers to prevent Cloud Run from failing health checks
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason);
});

// Enable CORS for frontend — allow Vercel + localhost
const allowedOrigins = [
  process.env.FRONTEND_URL || '',
  'http://localhost:3000',
  'http://localhost:5173',
  'https://lumensky.space',
  'https://www.lumensky.space'
].map(url => url.replace(/\/$/, '')).filter(Boolean);

app.use('*', cors({
  origin: (origin) => {
    // Allow if origin is in whitelist OR if no origin header (e.g. curl/Postman/same-origin)
    if (!origin) return '*';
    if (allowedOrigins.some(o => origin.startsWith(o))) return origin;
    // Allow any vercel.app subdomain for preview deployments
    if (origin.endsWith('.vercel.app')) return origin;
    return allowedOrigins[0] || origin;
  },
  allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Anonymous-Id'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Apply idempotency specifically to mutating requests, avoiding GET requests
app.post('*', requireIdempotency);
app.put('*', requireIdempotency);
app.patch('*', requireIdempotency);

// Global Error Handler to intercept LLM Quota / 429 Errors
app.onError((err: any, c) => {
  console.error('Global Route Error:', err);
  const msg: string = err.message || '';
  
  const isQuota = msg.toLowerCase().includes('quota') || 
                  msg.toLowerCase().includes('429') || 
                  msg.toLowerCase().includes('resource_exhausted') ||
                  msg.toLowerCase().includes('rate limit');
                  
  if (isQuota) {
    return c.json({ success: false, message: "AI is busy right now. Please retry in about a minute." }, 503);
  }
  
  // For standard errors
  return c.json({ success: false, message: "Something went wrong while generating the reply. Please try again.", error: err.message }, 503);
});


app.get('/', (c) => c.text('FP-OS Core Runtime Active'));
app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

// DEBUG: Public endpoint to test Gemini API key + model directly
app.get('/api/test-ai', async (c) => {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const keys = [
      process.env.GEMINI_API_KEY,
      process.env.AI_PROVIDER_KEY,
      process.env.AI_KEYS,
      process.env.GEMINI_KEYS,
      process.env.GOOGLE_API_KEY
    ].flatMap(k => k ? k.split(',') : []).map(k => k.trim()).filter(Boolean);
    const results: any[] = [];
    for (let i = 0; i < keys.length; i++) {
      try {
        const client = new GoogleGenAI({ apiKey: keys[i] });
        const resp = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
          config: { maxOutputTokens: 10 }
        });
        results.push({ key: i + 1, status: 'OK', text: resp.text });
      } catch (e: any) {
        results.push({ key: i + 1, status: 'ERROR', error: e?.message || String(e) });
      }
    }
    return c.json({ results });
  } catch (e: any) {
    return c.json({ error: e?.message }, 500);
  }
});

// Mount specific domains
app.route('/api/v1/interaction', interactionRoutes);
app.route('/api/v1/interaction', streamRoutes);
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/threads', threadRoutes);
app.route('/api/v1/oracle', oracleRoutes);
app.route('/api/v1/admin', adminRoutes);

// Cloud Run sets PORT env var to 8080 — always read directly from process.env
const PORT = process.env.PORT || 8080;

console.log(`Starting FP-OS Backend...`);

// Initialize database, vector storage & seeding
DbService.init().catch(console.error);
VectorService.init().catch(console.error);

const server = serve({
  fetch: app.fetch,
  port: Number(PORT),
  hostname: '0.0.0.0'
}, () => {
  console.log(`Server running on port ${PORT}`);
});

// Attach WebSocket Server
WebSocketService.init(server);



