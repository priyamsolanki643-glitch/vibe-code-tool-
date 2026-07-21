'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'model';
  text: string;
  soul?: SoulMeta;
}

interface SoulMeta {
  soul: string;
  soulName: string;
  emoji: string;
  color: string;
  emotion: string;
  tone: string;
}

const SOUL_DEFAULTS: SoulMeta = {
  soul: 'ORACLE',
  soulName: 'ORACLE',
  emoji: '🧠',
  color: '#8B5CF6',
  emotion: 'NEUTRAL',
  tone: 'DIRECT',
};

const WELCOME_MESSAGE = `Kuch bhi bol. Exam pressure ho, business idea ho, confusion ho, ya sirf baat karni ho — main yahan hun.\n\nTera kya chal raha hai?`;

// ─── API Util ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function* streamOracle(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  token: string,
  studentContext: string
): AsyncGenerator<{ type: 'soul'; data: SoulMeta } | { type: 'text'; data: string } | { type: 'done' }> {
  const resp = await fetch(`${API_BASE}/api/v1/oracle/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': `oracle-${Date.now()}-${Math.random()}`,
    },
    body: JSON.stringify({ message, conversationHistory: history, studentContext }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`Oracle stream failed: ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: soul')) continue;
      if (line.startsWith('event: done')) { yield { type: 'done' }; return; }
      if (line.startsWith('event: error')) continue;

      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') { yield { type: 'done' }; return; }

        // Try to parse as soul metadata
        try {
          const parsed = JSON.parse(data);
          if (parsed.soul && parsed.soulName) {
            yield { type: 'soul', data: parsed as SoulMeta };
            continue;
          }
        } catch { /* not JSON, treat as text */ }

        if (data) yield { type: 'text', data };
      }
    }
  }
  yield { type: 'done' };
}

// ─── Soul Badge Component ─────────────────────────────────────────────────────
function SoulBadge({ soul, animate }: { soul: SoulMeta; animate: boolean }) {
  return (
    <div
      className="oracle-soul-badge"
      style={{
        '--soul-color': soul.color,
        animation: animate ? 'soul-switch 0.5s ease-out' : 'none',
      } as React.CSSProperties}
    >
      <span className="oracle-soul-dot" style={{ background: soul.color }} />
      <span className="oracle-soul-text">
        {soul.emoji} {soul.soulName}
      </span>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`oracle-msg oracle-msg--${isUser ? 'user' : 'model'}`}>
      {!isUser && msg.soul && (
        <div className="oracle-msg-soul" style={{ color: msg.soul.color }}>
          {msg.soul.emoji} {msg.soul.soulName}
        </div>
      )}
      <div
        className="oracle-msg-bubble"
        style={
          !isUser && msg.soul
            ? { borderLeftColor: msg.soul.color }
            : undefined
        }
      >
        {msg.text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i < msg.text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main ORACLE Chat Component ───────────────────────────────────────────────
interface OracleChatProps {
  token?: string;
  studentContext?: string;
  className?: string;
  onOpenSidebar?: () => void;
  onOpenVault?: () => void;
}

export function OracleChat({ token: initialToken, studentContext = '', className = '', onOpenSidebar, onOpenVault }: OracleChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: WELCOME_MESSAGE, soul: SOUL_DEFAULTS },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSoul, setActiveSoul] = useState<SoulMeta>(SOUL_DEFAULTS);
  const [soulAnimate, setSoulAnimate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<boolean>(false);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateSoul = useCallback((soul: SoulMeta) => {
    setActiveSoul(soul);
    setSoulAnimate(true);
    setTimeout(() => setSoulAnimate(false), 600);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setError(null);
    abortRef.current = false;

    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);

    // Build history for API (exclude welcome message, map to API format)
    const history = messages
      .filter(m => m.text !== WELCOME_MESSAGE)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

    // Add placeholder for streaming
    setMessages(prev => [...prev, { role: 'model', text: '', soul: activeSoul }]);
    setIsStreaming(true);

    let currentSoul = activeSoul;

    try {
      let activeToken = initialToken;
      if (!activeToken) {
        const { data: { session } } = await supabase.auth.getSession();
        activeToken = session?.access_token || '';
      }

      const gen = streamOracle(text, history, activeToken, studentContext);

      for await (const chunk of gen) {
        if (abortRef.current) break;

        if (chunk.type === 'soul') {
          currentSoul = chunk.data;
          updateSoul(chunk.data);
          // Update the placeholder message's soul
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              soul: chunk.data,
            };
            return updated;
          });
        } else if (chunk.type === 'text') {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              text: updated[updated.length - 1].text + chunk.data,
            };
            return updated;
          });
        }
      }
    } catch (err: any) {
      console.error('[OracleChat] Error:', err);
      setError('ORACLE encountered a brief issue. Try again in a moment.');
      // Remove empty placeholder
      setMessages(prev => {
        const updated = [...prev];
        if (updated[updated.length - 1].text === '') updated.pop();
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, studentContext, activeSoul, updateSoul]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
  };

  return (
    <div className={`oracle-container ${className}`}>
      {/* Header */}
      <div className="oracle-header">
        <div className="oracle-header-left">
          {onOpenSidebar && (
            <button onClick={onOpenSidebar} className="p-1 hover:bg-white/10 rounded mr-2" style={{ color: 'white' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
          )}
          <span className="oracle-logo">🧠</span>
          <div>
            <div className="oracle-title">ORACLE</div>
            <div className="oracle-subtitle">Your Personal AI Mentor</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SoulBadge soul={activeSoul} animate={soulAnimate} />
          {onOpenVault && (
            <button onClick={onOpenVault} className="p-1 hover:bg-white/10 rounded ml-2" style={{ color: 'white' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="oracle-messages">
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* Typing indicator */}
        {isStreaming && messages[messages.length - 1]?.text === '' && (
          <div className="oracle-typing">
            <span /><span /><span />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="oracle-error">{error}</div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="oracle-input-area">
        <textarea
          ref={inputRef}
          className="oracle-input"
          placeholder="Kuch bhi puch... exam, life, business, ya bas baat karna ho..."
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          rows={1}
        />
        <button
          className="oracle-send"
          onClick={sendMessage}
          disabled={isStreaming || !input.trim()}
          style={{ '--soul-color': activeSoul.color } as React.CSSProperties}
        >
          {isStreaming ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx={12} cy={12} r={4} />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
