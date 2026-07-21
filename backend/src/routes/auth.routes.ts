import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import * as crypto from 'crypto';

export const authRoutes = new Hono();

const JWT_SECRET = process.env.JWT_SECRET;
const ALLOW_DEV_OTP_LOGGING = process.env.ALLOW_DEV_OTP_LOGGING === 'true';
const ENABLE_MOCK_OAUTH = process.env.ENABLE_MOCK_OAUTH === 'true';

interface OtpSession {
  target: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}

import { DbService } from '../services/db.service';

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

const COOLDOWN_MS = 60 * 1000;
const EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

function normalizeTarget(target: string): string {
  return target.trim().toLowerCase();
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isLikelyPhone(value: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(value.replace(/[\s\-()]/g, ''));
}

async function issueJwt(userId: string) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return sign(
    {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    },
    JWT_SECRET
  );
}

authRoutes.post('/otp/send', async (c) => {
  try {
    if (!JWT_SECRET) {
      return c.json({ error: 'Authentication service is not configured.' }, 500);
    }

    const body = await c.req.json();
    const { target, type } = body || {};

    if (!target || !type || (type !== 'email' && type !== 'phone')) {
      return c.json({ error: 'Invalid target address or verification type.' }, 400);
    }

    const normalizedTarget = normalizeTarget(String(target));
    const now = Date.now();
    const existing = await DbService.getOtpSession(normalizedTarget);

    if (type === 'email' && !isLikelyEmail(normalizedTarget)) {
      return c.json({ error: 'Invalid email address.' }, 400);
    }

    if (type === 'phone' && !isLikelyPhone(normalizedTarget)) {
      return c.json({ error: 'Invalid phone number.' }, 400);
    }

    if (existing && now - existing.lastSentAt < COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
      return c.json(
        {
          error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`
        },
        429
      );
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = sha256(code);

    await DbService.saveOtpSession({
      target: normalizedTarget,
      codeHash,
      expiresAt: now + EXPIRY_MS,
      attempts: 0,
      lastSentAt: now
    });

    if (ALLOW_DEV_OTP_LOGGING) {
      console.log('\n======================================');
      console.log(`[AUTH SERVICE] OTP dispatch to ${normalizedTarget.toUpperCase()}`);
      console.log(`CODE: ${code}`);
      console.log(`EXPIRE: 5 minutes | HASH: ${codeHash}`);
      console.log('======================================\n');
    }

    return c.json({
      status: 'success',
      message: `Verification code successfully dispatched to your registered ${
        type === 'email' ? 'email address' : 'phone number'
      }.`
    });
  } catch (error: any) {
    console.error('OTP Send Error:', error);
    return c.json({ error: 'Failed to send verification code.' }, 500);
  }
});

authRoutes.post('/otp/verify', async (c) => {
  try {
    if (!JWT_SECRET) {
      return c.json({ error: 'Authentication service is not configured.' }, 500);
    }

    const body = await c.req.json();
    const { target, code } = body || {};

    if (!target || !code) {
      return c.json({ error: 'Target identifier and verification code are required.' }, 400);
    }

    const normalizedTarget = normalizeTarget(String(target));
    const normalizedCode = String(code).trim();
    const session = await DbService.getOtpSession(normalizedTarget);

    if (!session) {
      return c.json({ error: 'No active verification session found. Request a new code.' }, 400);
    }

    const now = Date.now();

    if (now > session.expiresAt) {
      await DbService.deleteOtpSession(normalizedTarget);
      return c.json({ error: 'Verification code has expired. Please request a new one.' }, 400);
    }

    if (session.attempts >= MAX_ATTEMPTS) {
      await DbService.deleteOtpSession(normalizedTarget);
      return c.json({ error: 'Maximum verification attempts exceeded. Session locked.' }, 423);
    }

    const inputHash = sha256(normalizedCode);

    if (inputHash !== session.codeHash) {
      session.attempts += 1;
      await DbService.saveOtpSession(session);

      const attemptsLeft = MAX_ATTEMPTS - session.attempts;

      if (attemptsLeft <= 0) {
        await DbService.deleteOtpSession(normalizedTarget);
        return c.json({ error: 'Maximum attempts exceeded. Verification session terminated.' }, 423);
      }

      return c.json(
        { error: `Incorrect verification code. ${attemptsLeft} attempts remaining.` },
        400
      );
    }

    await DbService.deleteOtpSession(normalizedTarget);

    const token = await issueJwt(normalizedTarget);

    return c.json({
      status: 'success',
      data: {
        token,
        user: {
          userId: normalizedTarget,
          email: normalizedTarget.includes('@') ? normalizedTarget : null,
          phone: !normalizedTarget.includes('@') ? normalizedTarget : null
        }
      }
    });
  } catch (error: any) {
    console.error('OTP Verify Error:', error);
    return c.json({ error: 'Failed to verify code.' }, 500);
  }
});

authRoutes.post('/oauth/google', async (c) => {
  if (!ENABLE_MOCK_OAUTH) {
    return c.json({ error: 'Google OAuth is not configured on this server.' }, 501);
  }

  try {
    if (!JWT_SECRET) {
      return c.json({ error: 'Authentication service is not configured.' }, 500);
    }

    const { token: googleToken } = await c.req.json();

    if (!googleToken) {
      return c.json({ error: 'Google OAuth token is required.' }, 400);
    }

    const mockGoogleUser = 'google-user@gmail.com';
    const jwtToken = await issueJwt(mockGoogleUser);

    return c.json({
      status: 'success',
      data: {
        token: jwtToken,
        user: {
          userId: mockGoogleUser,
          email: mockGoogleUser,
          phone: null
        }
      }
    });
  } catch (error: any) {
    console.error('Google OAuth Error:', error);
    return c.json({ error: 'Failed to authenticate with Google.' }, 500);
  }
});

authRoutes.post('/oauth/github', async (c) => {
  if (!ENABLE_MOCK_OAUTH) {
    return c.json({ error: 'GitHub OAuth is not configured on this server.' }, 501);
  }

  try {
    if (!JWT_SECRET) {
      return c.json({ error: 'Authentication service is not configured.' }, 500);
    }

    const { code } = await c.req.json();

    if (!code) {
      return c.json({ error: 'GitHub authorization code is required.' }, 400);
    }

    const mockGithubUser = 'github-user@github.com';
    const jwtToken = await issueJwt(mockGithubUser);

    return c.json({
      status: 'success',
      data: {
        token: jwtToken,
        user: {
          userId: mockGithubUser,
          email: mockGithubUser,
          phone: null
        }
      }
    });
  } catch (error: any) {
    console.error('GitHub OAuth Error:', error);
    return c.json({ error: 'Failed to authenticate with GitHub.' }, 500);
  }
});
