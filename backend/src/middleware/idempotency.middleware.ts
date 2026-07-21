import { Context, Next } from 'hono';

interface CachedResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
}

// In-memory idempotency cache (TTL: 5 minutes)
const idempotencyCache = new Map<string, CachedResponse>();

// Clean up expired keys every minute to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of idempotencyCache.entries()) {
    if (now - val.timestamp > 5 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}, 60 * 1000);

export const requireIdempotency = async (c: Context, next: Next) => {
  const idempotencyKey = c.req.header('Idempotency-Key');

  if (!idempotencyKey) {
    await next();
    return;
  }

  // Check cache
  const cached = idempotencyCache.get(idempotencyKey);
  if (cached) {
    console.log(`IDEMPOTENCY: Duplicate request detected for key: ${idempotencyKey}. Serving from cache.`);
    
    // Set cached headers
    Object.entries(cached.headers).forEach(([k, v]) => {
      c.header(k, v);
    });

    c.status(cached.status as any);
    return c.json(JSON.parse(cached.body));
  }

  // Capture response by proceeding
  await next();

  // If response is successful, cache it
  if (c.res && c.res.status >= 200 && c.res.status < 300) {
    try {
      const resClone = c.res.clone();
      const body = await resClone.text();
      
      const headers: Record<string, string> = {
        'X-Idempotency-Cache': 'HIT',
        'X-Idempotency-Key': idempotencyKey
      };

      if (idempotencyCache.size >= 5000) {
        const firstKey = idempotencyCache.keys().next().value;
        if (firstKey) idempotencyCache.delete(firstKey);
      }

      idempotencyCache.set(idempotencyKey, {
        status: c.res.status,
        body,
        headers,
        timestamp: Date.now()
      });

      // Add header to indicate the current response was computed and stored
      c.header('X-Idempotency-Cache', 'MISS');
    } catch (e) {
      console.error('IDEMPOTENCY: Error cloning response for caching:', e);
    }
  }
};
