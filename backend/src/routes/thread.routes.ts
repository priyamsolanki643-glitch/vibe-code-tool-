import { Hono } from 'hono';
import { DbService } from '../services/db.service';
import { requireAuth } from '../middleware/auth.middleware';

export const threadRoutes = new Hono<{ Variables: { userId: string } }>();

threadRoutes.use('*', requireAuth);

threadRoutes.get('/', async (c) => {
  try {
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const searchQuery = c.req.query('q') || '';
    const threads = await DbService.getChatThreads(userId, searchQuery);
    return c.json({ status: 'success', data: threads });
  } catch (error: any) {
    console.error('Fetch Threads Error:', error);
    return c.json({ error: 'Failed to fetch threads.' }, 500);
  }
});


threadRoutes.post('/sync', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { title, messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'Messages array is required.' }, 400);
    }

    const threadTitle = title || (messages.length > 0 ? messages[0].text?.substring(0, 40) + '...' : 'Anonymous Chat');
    const thread = await DbService.createChatThread(userId, threadTitle);

    for (const msg of messages) {
      // role should be 'user' or 'fp', text should be the message content
      await DbService.saveMessage(thread.id, userId, msg.role, msg.text);
    }

    return c.json({ status: 'success', threadId: thread.id });
  } catch (error: any) {
    console.error('Sync Thread Error:', error);
    return c.json({ error: 'Failed to sync thread.' }, 500);
  }
});

threadRoutes.get('/:id/messages', async (c) => {
  try {
    const userId = c.get('userId');
    const threadId = c.req.param('id');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!threadId) {
      return c.json({ error: 'Thread id is required.' }, 400);
    }

    const threads = await DbService.getChatThreads(userId);
    const ownsThread = threads.some((t) => t.id === threadId);

    if (!ownsThread) {
      return c.json({ error: 'Thread not found.' }, 404);
    }

    const messages = await DbService.getMessages(threadId);
    return c.json({ status: 'success', data: messages });
  } catch (error: any) {
    console.error('Fetch Messages Error:', error);
    return c.json({ error: 'Failed to fetch messages.' }, 500);
  }
});

threadRoutes.delete('/:id', async (c) => {
  try {
    const threadId = c.req.param('id');
    const userId = c.get('userId');

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (!threadId) {
      return c.json({ error: 'Thread id is required.' }, 400);
    }

    const threads = await DbService.getChatThreads(userId);
    const ownsThread = threads.some((t) => t.id === threadId);

    if (!ownsThread) {
      return c.json({ error: 'Thread not found.' }, 404);
    }

    const success = await DbService.deleteChatThread(threadId, userId);

    if (!success) {
      return c.json({ error: 'Failed to delete thread.' }, 500);
    }

    return c.json({ status: 'success' });
  } catch (error: any) {
    console.error('Delete Thread Error:', error);
    return c.json({ error: 'Failed to delete thread.' }, 500);
  }
});
