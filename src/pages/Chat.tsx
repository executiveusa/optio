/**
 * Chat Page — Main screen of Metamorfosis
 * ─────────────────────────────────────────────────────────────────────────────
 * Chat-first AI agent interface for LATAM women entrepreneurs.
 * Integrates: agent-loop.ts, VoiceContext, LanguageContext.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useVoice } from '../context/VoiceContext';
import { runAgentLoop, registerTool } from '../agent/agent-loop';
import { AGENT_CONFIG, type ConversationState, type AgentMessage } from '../agent/agent-config';
import { initializeTools } from '../agent/index';
import VirtualizedMessages from '../components/VirtualizedMessages';

// ─── INIT TOOLS ──────────────────────────────────────────────────────────────
initializeTools();

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ActiveTab = 'chat' | 'food' | 'progress' | 'brain' | 'settings';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getStoredConversation(): ConversationState {
  try {
    const raw = localStorage.getItem('meta_conversation');
    if (raw) return JSON.parse(raw) as ConversationState;
  } catch {}
  return {
    id: crypto.randomUUID(),
    messages: [],
    userProfile: {
      name: localStorage.getItem('meta_name') ?? 'Usuario',
      goals: JSON.parse(localStorage.getItem('meta_goals') ?? '[]'),
      diet: localStorage.getItem('meta_diet') ?? 'omnivora',
      preferences: {},
    },
    activeTools: [],
    turnCount: 0,
  };
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function Chat() {
  const { t, lang, setLang } = useLanguage();
  const { state: voiceState, startListening, stopListening, speak, cancelSpeech } = useVoice();

  const [tab, setTab] = useState<ActiveTab>('chat');
  const [conversation, setConversation] = useState<ConversationState>(getStoredConversation);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Welcome message on first load
  useEffect(() => {
    if (conversation.messages.length === 0) {
      const welcome: AgentMessage = {
        role: 'assistant',
        content: t('chat.welcome'),
        timestamp: Date.now(),
      };
      setConversation((prev) => ({ ...prev, messages: [welcome] }));
    }
  }, []);

  // Persist conversation
  useEffect(() => {
    localStorage.setItem('meta_conversation', JSON.stringify(conversation));
  }, [conversation]);

  // ─── SEND MESSAGE ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setInput('');
      setIsLoading(true);
      setStreamingText('');

      const apiKey =
        localStorage.getItem('meta_byok') ??
        (import.meta as any).env?.VITE_OPENAI_KEY ??
        '';

      try {
        const response = await runAgentLoop(text, conversation, {
          apiKey,
          onStream: (chunk) => setStreamingText((prev) => prev + chunk),
          onToolCall: (name) => console.log('[tool]', name),
        });

        setConversation((prev) => ({
          ...prev,
          messages: [...prev.messages, response],
        }));
        setStreamingText('');
      } catch (err) {
        const errorMsg: AgentMessage = {
          role: 'assistant',
          content: t('general.error'),
          timestamp: Date.now(),
        };
        setConversation((prev) => ({ ...prev, messages: [...prev.messages, errorMsg] }));
      } finally {
        setIsLoading(false);
      }
    },
    [conversation, isLoading, t],
  );

  // ─── VOICE INPUT ──────────────────────────────────────────────────────────

  const handleVoice = useCallback(async () => {
    if (voiceState === 'listening') {
      stopListening();
      return;
    }
    try {
      const transcript = await startListening(lang);
      if (transcript) sendMessage(transcript);
    } catch {}
  }, [voiceState, startListening, stopListening, lang, sendMessage]);

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0e1a',
        color: '#edf0f5',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
        maxWidth: '430px',
        margin: '0 auto',
      }}
    >
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600&display=swap"
      />

      {/* Header */}
      <header
        style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(43,143,217,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        {/* Butterfly avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2b8fd9, #1a5fa0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}
        >
          🦋
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontFamily: "'Playfair Display', serif",
              fontSize: '17px',
              fontWeight: 500,
              color: '#edf0f5',
            }}
          >
            Metamorfosis
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#4a9a5a' }}>
            ● {t('chat.online')}
          </p>
        </div>
        {/* Language toggle */}
        <button
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          style={{
            background: 'rgba(43,143,217,0.1)',
            border: '1px solid rgba(43,143,217,0.25)',
            borderRadius: '20px',
            color: '#5ec4e8',
            fontSize: '12px',
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </header>

      {/* Main content area */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'chat' && (
          <>
            {/* Virtualized Messages (pretext-powered height measurement) */}
            <VirtualizedMessages
              messages={conversation.messages}
              streamingText={streamingText}
              isLoading={isLoading}
              typingLabel={t('chat.typing')}
            />

            {/* Input bar */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(43,143,217,0.08)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
              }}
            >
              {/* Voice button */}
              <button
                onClick={handleVoice}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background:
                    voiceState === 'listening'
                      ? 'linear-gradient(135deg, #2b8fd9, #1a5fa0)'
                      : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(43,143,217,0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {voiceState === 'listening' ? '⏹' : '🎙'}
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={
                  voiceState === 'listening' ? t('voice.listening') : t('chat.placeholder')
                }
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(43,143,217,0.15)',
                  borderRadius: '20px',
                  padding: '10px 16px',
                  color: '#edf0f5',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background:
                    input.trim() && !isLoading
                      ? 'linear-gradient(135deg, #2b8fd9, #1a5fa0)'
                      : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                ↑
              </button>
            </div>
          </>
        )}

        {tab === 'food' && (
          <PlaceholderTab title={t('meals.title')} emoji="🥗" />
        )}
        {tab === 'progress' && (
          <PlaceholderTab title={t('progress.title')} emoji="📈" />
        )}
        {tab === 'brain' && (
          <PlaceholderTab title={t('brain.title')} emoji="🧠" />
        )}
        {tab === 'settings' && (
          <SettingsTab t={t} lang={lang} setLang={setLang} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        style={{
          display: 'flex',
          borderTop: '1px solid rgba(43,143,217,0.10)',
          background: '#0a0e1a',
          paddingBottom: 'env(safe-area-inset-bottom)',
          flexShrink: 0,
        }}
      >
        {(
          [
            { key: 'chat', emoji: '💬', labelKey: 'nav.chat' },
            { key: 'food', emoji: '🥗', labelKey: 'nav.food' },
            { key: 'progress', emoji: '📈', labelKey: 'nav.progress' },
            { key: 'brain', emoji: '🧠', labelKey: 'nav.brain' },
            { key: 'settings', emoji: '⚙️', labelKey: 'nav.settings' },
          ] as const
        ).map(({ key, emoji, labelKey }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '10px 4px 8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              color: tab === key ? '#5ec4e8' : 'rgba(237,240,245,0.35)',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: '20px' }}>{emoji}</span>
            <span style={{ fontSize: '10px', fontWeight: tab === key ? 600 : 400 }}>
              {t(labelKey)}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function PlaceholderTab({ title, emoji }: { title: string; emoji: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: 'rgba(237,240,245,0.35)',
      }}
    >
      <span style={{ fontSize: '48px' }}>{emoji}</span>
      <p style={{ margin: 0, fontSize: '18px' }}>{title}</p>
      <p style={{ margin: 0, fontSize: '13px', opacity: 0.6 }}>Próximamente</p>
    </div>
  );
}

function SettingsTab({
  t,
  lang,
  setLang,
}: {
  t: (k: string) => string;
  lang: string;
  setLang: (l: 'es' | 'en') => void;
}) {
  const [byok, setByok] = useState(localStorage.getItem('meta_byok') ?? '');

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '22px', color: '#edf0f5' }}>
        {t('settings.title')}
      </h2>

      {/* Language */}
      <div>
        <label style={{ fontSize: '13px', color: 'rgba(237,240,245,0.5)', display: 'block', marginBottom: '8px' }}>
          {t('settings.language')}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['es', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: `1px solid ${lang === l ? '#2b8fd9' : 'rgba(43,143,217,0.15)'}`,
                background: lang === l ? 'rgba(43,143,217,0.1)' : 'transparent',
                color: lang === l ? '#5ec4e8' : 'rgba(237,240,245,0.5)',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {l === 'es' ? '🇲🇽 Español' : '🇺🇸 English'}
            </button>
          ))}
        </div>
      </div>

      {/* BYOK */}
      <div>
        <label style={{ fontSize: '13px', color: 'rgba(237,240,245,0.5)', display: 'block', marginBottom: '8px' }}>
          {t('settings.byok')}
        </label>
        <input
          type="password"
          value={byok}
          onChange={(e) => {
            setByok(e.target.value);
            localStorage.setItem('meta_byok', e.target.value);
          }}
          placeholder="sk-..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(43,143,217,0.15)',
            borderRadius: '8px',
            padding: '10px 14px',
            color: '#edf0f5',
            fontSize: '14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tier */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'rgba(43,143,217,0.06)',
          border: '1px solid rgba(43,143,217,0.15)',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'rgba(237,240,245,0.5)' }}>Plan actual</p>
        <p style={{ margin: 0, fontSize: '16px', color: '#5ec4e8', fontWeight: 600 }}>{t('settings.tier.free')}</p>
      </div>

      {/* App info */}
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(237,240,245,0.2)', textAlign: 'center' }}>
        Metamorfosis v1.1 · {AGENT_CONFIG.model} · Gateway: {(import.meta as any).env?.VITE_GATEWAY_URL ?? 'localhost:3000'}
      </p>
    </div>
  );
}
