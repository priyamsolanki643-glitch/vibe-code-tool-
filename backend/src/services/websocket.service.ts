import '../utils/env';
import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from '@supabase/supabase-js';
import * as url from 'url';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isLocalFallback = !supabaseUrl || !supabaseKey;

const supabase =
  !isLocalFallback && supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

type WSOutboundPayload = {
  event: string;
  data?: any;
  error?: string;
};

function safeSend(ws: WebSocket, payload: WSOutboundPayload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    console.error('WS_SERVICE: Failed to send payload:', err);
  }
}

function sanitizeErrorMessage(err: any): string {
  const raw =
    err?.message ||
    err?.error?.message ||
    err?.cause?.message ||
    'Unknown websocket error';

  const msg = String(raw).toLowerCase();

  if (
    msg.includes('quota exceeded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('429') ||
    msg.includes('rate limit')
  ) {
    return 'Bhai teri consistency check karne mein mera engine thoda overload ho gaya hai. Tera naya plan calculate karne me mujhe ek minute lag raha hai. Jab tak system reboot hota hai, tu chup chaap apna pichla task revise kar. Time waste mat kar!';
  }

  return 'Temporary websocket error. Please reconnect.';
}

export class WebSocketService {
  private static wss: WebSocketServer | null = null;
  private static clients = new Map<string, WebSocket>();

  static init(server: any) {
    if (this.wss) {
      console.warn('WS_SERVICE: WebSocket server already initialized.');
      return;
    }

    console.log('WS_SERVICE: Initializing WebSocket server...');
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', async (request: IncomingMessage, socket: any, head: any) => {
      try {
        const parsedUrl = url.parse(request.url || '', true);
        const pathname = parsedUrl.pathname || '';
        const query = parsedUrl.query;

        // Optional: only handle websocket upgrade on a known path
        // If you want to allow all upgrade paths, remove this guard.
        if (!pathname.includes('/ws')) {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
          socket.destroy();
          return;
        }

        let userId = '';

        if (isLocalFallback) {
          userId = (query['x-device-id'] as string) || 'local-dev-user';
        } else {
          const token = query['token'] as string;

          if (!token || !supabase) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          const {
            data: { user },
            error
          } = await supabase.auth.getUser(token);

          if (error || !user) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          userId = user.id;
        }

        this.wss?.handleUpgrade(request, socket, head, (ws) => {
          this.wss?.emit('connection', ws, request, userId);
        });
      } catch (err) {
        console.error('WS_SERVICE: Upgrade authorization error:', err);
        try {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        } catch {}
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage, userId: string) => {
      console.log(`WS_SERVICE: Connection established for user: ${userId}`);

      const existing = this.clients.get(userId);
      if (existing && existing.readyState === WebSocket.OPEN) {
        safeSend(existing, {
          event: 'disconnected',
          error: 'A new session was opened for this user.'
        });
        existing.close();
      }

      this.clients.set(userId, ws);

      safeSend(ws, {
        event: 'connected',
        data: {
          userId,
          message: 'Secure execution channel active.'
        }
      });

      ws.on('message', (message: Buffer | string) => {
        try {
          const rawText = typeof message === 'string' ? message : message.toString('utf8');
          const parsed = JSON.parse(rawText);

          console.log(`WS_SERVICE: Received message from user ${userId}:`, parsed);

          safeSend(ws, {
            event: 'acknowledge',
            data: {
              received: true,
              time: new Date().toISOString()
            }
          });
        } catch (err) {
          safeSend(ws, {
            event: 'error',
            error: 'Invalid JSON payload'
          });
        }
      });

      ws.on('close', () => {
        console.log(`WS_SERVICE: Connection closed for user: ${userId}`);
        const current = this.clients.get(userId);
        if (current === ws) {
          this.clients.delete(userId);
        }
      });

      ws.on('error', (err) => {
        console.error(`WS_SERVICE: Error on socket for user ${userId}:`, err);
        safeSend(ws, {
          event: 'error',
          error: sanitizeErrorMessage(err)
        });

        const current = this.clients.get(userId);
        if (current === ws) {
          this.clients.delete(userId);
        }
      });
    });
  }

  static sendToUser(userId: string, event: string, data: any): boolean {
    const client = this.clients.get(userId);

    if (client && client.readyState === WebSocket.OPEN) {
      safeSend(client, { event, data });
      return true;
    }

    return false;
  }

  static sendErrorToUser(userId: string, err: any): boolean {
    const client = this.clients.get(userId);

    if (client && client.readyState === WebSocket.OPEN) {
      safeSend(client, {
        event: 'error',
        error: sanitizeErrorMessage(err)
      });
      return true;
    }

    return false;
  }

  static streamTokenToUser(userId: string, event: string, token: string, isLast = false) {
    this.sendToUser(userId, event, { token, isLast });
  }

  static broadcast(event: string, data: any) {
    if (!this.wss) return;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        safeSend(client, { event, data });
      }
    });
  }

  static getActiveConnectionsCount(): number {
    return this.clients.size;
  }
}
