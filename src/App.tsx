/**
 * Metamorfosis — Root App
 * ─────────────────────────────────────────────────
 * Chat-first wellness app for LATAM women entrepreneurs.
 * Architecture: React shell → agent layer (src/agent) → synthia-gateway → LLM
 */

import React, { Suspense, useEffect, useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { VoiceProvider } from './context/VoiceContext';
import Chat from './pages/Chat';
import Onboarding from './pages/Onboarding';
import CinematicHero from './components/CinematicHero';

// ─── LOADING FALLBACK ───────────────────────────────────────────────────────
const Loader = () => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0e1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path
        d="M32 4C32 4 20 16 12 26C4 36 4 44 12 50C20 56 32 56 32 56C32 56 44 56 52 50C60 44 60 36 52 26C44 16 32 4 32 4Z"
        fill="#2b8fd9"
        opacity="0.9"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 32 32"
          to="360 32 32"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  </div>
);

// ─── ONBOARDING GATE ────────────────────────────────────────────────────────
function AppShell() {
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('meta_onboarded') === 'true';
  });
  const [heroSeen, setHeroSeen] = useState<boolean>(() => {
    return sessionStorage.getItem('meta_hero_seen') === 'true';
  });

  const handleHeroComplete = () => {
    sessionStorage.setItem('meta_hero_seen', 'true');
    setHeroSeen(true);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('meta_onboarded', 'true');
    setOnboarded(true);
  };

  // Show cinematic hero on first visit of each session (before onboarding)
  if (!onboarded && !heroSeen) {
    return <CinematicHero onEnter={handleHeroComplete} />;
  }

  if (!onboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return <Chat />;
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <LanguageProvider defaultLang={(import.meta as any).env?.VITE_DEFAULT_LANG ?? 'es'}>
      <VoiceProvider>
        <Suspense fallback={<Loader />}>
          <AppShell />
        </Suspense>
      </VoiceProvider>
    </LanguageProvider>
  );
}
