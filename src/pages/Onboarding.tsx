/**
 * Onboarding — 6-step first run for Metamorfosis
 * ───────────────────────────────────────────────
 * Steps: Welcome → Name → Goals → Diet → Privacy → Ready
 */

import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface OnboardingProps {
  onComplete: () => void;
}

const GOAL_OPTIONS = [
  { id: 'bajar_peso', es: 'Bajar de peso', en: 'Lose weight', emoji: '⚖️' },
  { id: 'comer_mejor', es: 'Comer mejor', en: 'Eat better', emoji: '🥗' },
  { id: 'mas_energia', es: 'Más energía', en: 'More energy', emoji: '⚡' },
  { id: 'reducir_estres', es: 'Reducir estrés', en: 'Reduce stress', emoji: '🧘' },
  { id: 'dormir_mejor', es: 'Dormir mejor', en: 'Sleep better', emoji: '💤' },
  { id: 'bienestar', es: 'Bienestar general', en: 'Overall wellness', emoji: '🌱' },
];

const DIET_OPTIONS = [
  { id: 'omnivora', es: 'Omnívora', en: 'Omnivore', emoji: '🍖' },
  { id: 'vegetariana', es: 'Vegetariana', en: 'Vegetarian', emoji: '🥦' },
  { id: 'vegana', es: 'Vegana', en: 'Vegan', emoji: '🌿' },
  { id: 'pescetariana', es: 'Pescetariana', en: 'Pescatarian', emoji: '🐟' },
  { id: 'sin_gluten', es: 'Sin gluten', en: 'Gluten-free', emoji: '🌾' },
  { id: 'keto', es: 'Keto', en: 'Keto', emoji: '🥑' },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [diet, setDiet] = useState('');

  const totalSteps = 6; // 0-indexed: 0=welcome, 1=name, 2=goals, 3=diet, 4=privacy, 5=ready

  const progress = ((step + 1) / totalSteps) * 100;

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
  };

  const canContinue = (): boolean => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return goals.length > 0;
    if (step === 3) return diet !== '';
    return true;
  };

  const handleNext = () => {
    if (step === totalSteps - 1) {
      // Persist
      localStorage.setItem('meta_name', name);
      localStorage.setItem('meta_goals', JSON.stringify(goals));
      localStorage.setItem('meta_diet', diet);
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  // ─── STYLES ────────────────────────────────────────────────────────────────

  const screenStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: '#0a0e1a',
    color: '#edf0f5',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '430px',
    margin: '0 auto',
    overflow: 'hidden',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '40px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '12px 16px',
    borderRadius: '12px',
    border: `1px solid ${active ? '#2b8fd9' : 'rgba(43,143,217,0.2)'}`,
    background: active ? 'rgba(43,143,217,0.12)' : 'rgba(255,255,255,0.04)',
    color: active ? '#5ec4e8' : 'rgba(237,240,245,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.15s',
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={screenStyle}>
      {/* Google Fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600&display=swap"
      />

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(43,143,217,0.12)', flexShrink: 0 }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #2b8fd9, #1a5fa0)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      <div style={contentStyle}>
        {/* ── Step 0: Welcome ──────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div style={{ fontSize: '64px', textAlign: 'center' }}>🦋</div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Playfair Display', serif",
                fontSize: '28px',
                color: '#edf0f5',
                textAlign: 'center',
              }}
            >
              {t('onboarding.welcome.title')}
            </h1>
            <p
              style={{ margin: 0, textAlign: 'center', color: 'rgba(237,240,245,0.6)', fontSize: '15px', lineHeight: 1.6 }}
            >
              {t('onboarding.welcome.subtitle')}
            </p>
          </>
        )}

        {/* ── Step 1: Name ─────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#edf0f5' }}>
              {t('onboarding.name.title')}
            </h2>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canContinue() && handleNext()}
              placeholder={t('onboarding.name.placeholder')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(43,143,217,0.25)',
                borderRadius: '12px',
                padding: '14px 16px',
                color: '#edf0f5',
                fontSize: '16px',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </>
        )}

        {/* ── Step 2: Goals ────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#edf0f5' }}>
              {t('onboarding.goals.title')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {GOAL_OPTIONS.map((g) => (
                <button key={g.id} style={chipStyle(goals.includes(g.id))} onClick={() => toggleGoal(g.id)}>
                  <span>{g.emoji}</span>
                  <span>{lang === 'es' ? g.es : g.en}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 3: Diet ─────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#edf0f5' }}>
              {t('onboarding.diet.title')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {DIET_OPTIONS.map((d) => (
                <button key={d.id} style={chipStyle(diet === d.id)} onClick={() => setDiet(d.id)}>
                  <span>{d.emoji}</span>
                  <span>{lang === 'es' ? d.es : d.en}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 4: Privacy ──────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <div style={{ fontSize: '48px', textAlign: 'center' }}>🔒</div>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '24px', color: '#edf0f5', textAlign: 'center' }}>
              {t('onboarding.privacy.title')}
            </h2>
            <p style={{ margin: 0, color: 'rgba(237,240,245,0.6)', fontSize: '15px', lineHeight: 1.6, textAlign: 'center' }}>
              {t('onboarding.privacy.body')}
            </p>
            {/* Feature chips */}
            {[
              { icon: '🔐', text: lang === 'es' ? 'Cifrado AES-256-GCM local' : 'Local AES-256-GCM encryption' },
              { icon: '🚫', text: lang === 'es' ? 'Sin rastreo de terceros' : 'No third-party tracking' },
              { icon: '🗝️', text: lang === 'es' ? 'Usa tu propia llave de API' : 'Bring your own API key' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: '20px' }}>{f.icon}</span>
                <span style={{ fontSize: '14px', color: 'rgba(237,240,245,0.75)' }}>{f.text}</span>
              </div>
            ))}
          </>
        )}

        {/* ── Step 5: Ready ────────────────────────────────────────────── */}
        {step === 5 && (
          <>
            <div style={{ fontSize: '64px', textAlign: 'center' }}>✨</div>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '28px', color: '#edf0f5', textAlign: 'center' }}>
              {lang === 'es' ? `¡Hola, ${name}!` : `Hi, ${name}!`}
            </h2>
            <p style={{ margin: 0, color: 'rgba(237,240,245,0.6)', fontSize: '15px', lineHeight: 1.6, textAlign: 'center' }}>
              {t('onboarding.ready.subtitle')}
            </p>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '16px 24px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))', flexShrink: 0 }}>
        <button
          onClick={handleNext}
          disabled={!canContinue()}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            background:
              canContinue()
                ? 'linear-gradient(135deg, #2b8fd9, #1a5fa0)'
                : 'rgba(255,255,255,0.06)',
            color: canContinue() ? '#edf0f5' : 'rgba(237,240,245,0.25)',
            fontSize: '16px',
            fontWeight: 600,
            cursor: canContinue() ? 'pointer' : 'default',
            transition: 'all 0.2s',
          }}
        >
          {step === totalSteps - 1 ? t('onboarding.start') : t('onboarding.next')}
        </button>
      </div>
    </div>
  );
}
