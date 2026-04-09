/**
 * LanguageContext — ES / EN i18n for Metamorfosis
 * ───────────────────────────────────────────────
 * Provides a simple language switcher and t() translation helper.
 * Default language is 'es' (Spanish / Mexican).
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Lang = 'es' | 'en';

// ─── TRANSLATIONS ────────────────────────────────────────────────────────────

const translations: Record<Lang, Record<string, string>> = {
  es: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.food': 'Comida',
    'nav.progress': 'Progreso',
    'nav.brain': 'Cerebro',
    'nav.settings': 'Ajustes',

    // Chat
    'chat.placeholder': 'Escribe o habla…',
    'chat.send': 'Enviar',
    'chat.online': 'En línea',
    'chat.typing': 'escribiendo…',
    'chat.voice': 'Hablar',
    'chat.welcome': '¡Hola! Soy tu guía de bienestar. ¿Cómo te puedo ayudar hoy?',

    // Onboarding
    'onboarding.welcome.title': 'Bienvenida a Metamorfosis',
    'onboarding.welcome.subtitle': 'Tu espacio de transformación personal',
    'onboarding.name.title': '¿Cómo te llamas?',
    'onboarding.name.placeholder': 'Tu nombre…',
    'onboarding.goals.title': '¿Cuáles son tus metas?',
    'onboarding.diet.title': '¿Cuál es tu preferencia alimentaria?',
    'onboarding.privacy.title': 'Tu privacidad es sagrada',
    'onboarding.privacy.body': 'Todos tus datos se cifran localmente. Tu llave, tu información.',
    'onboarding.ready.title': '¡Estás lista!',
    'onboarding.ready.subtitle': 'Tu viaje de transformación comienza ahora',
    'onboarding.next': 'Siguiente',
    'onboarding.start': 'Comenzar',

    // Meals
    'meals.title': 'Plan de Comida',
    'meals.generate': 'Generar Plan',
    'meals.week': 'Esta semana',

    // Progress
    'progress.title': 'Mi Progreso',
    'progress.weight': 'Peso',
    'progress.streak': 'Racha',
    'progress.days': 'días',

    // Brain / Notes
    'brain.title': 'Segundo Cerebro',
    'brain.new': 'Nueva nota',
    'brain.search': 'Buscar notas…',

    // Settings
    'settings.title': 'Ajustes',
    'settings.language': 'Idioma',
    'settings.model': 'Modelo de IA',
    'settings.byok': 'Tu propia llave de API',
    'settings.premium': 'Premium',
    'settings.logout': 'Cerrar sesión',
    'settings.tier.free': 'Plan Gratuito',
    'settings.tier.premium': 'Plan Premium',

    // Voice
    'voice.listening': 'Escuchando…',
    'voice.processing': 'Procesando…',
    'voice.error': 'No se pudo escuchar. Intenta de nuevo.',

    // General
    'general.loading': 'Cargando…',
    'general.error': 'Algo salió mal. Intenta de nuevo.',
    'general.save': 'Guardar',
    'general.cancel': 'Cancelar',
    'general.close': 'Cerrar',
    'general.back': 'Atrás',
  },

  en: {
    // Navigation
    'nav.chat': 'Chat',
    'nav.food': 'Meals',
    'nav.progress': 'Progress',
    'nav.brain': 'Brain',
    'nav.settings': 'Settings',

    // Chat
    'chat.placeholder': 'Type or speak…',
    'chat.send': 'Send',
    'chat.online': 'Online',
    'chat.typing': 'typing…',
    'chat.voice': 'Speak',
    'chat.welcome': 'Hi! I\'m your wellness guide. How can I help you today?',

    // Onboarding
    'onboarding.welcome.title': 'Welcome to Metamorfosis',
    'onboarding.welcome.subtitle': 'Your personal transformation space',
    'onboarding.name.title': 'What\'s your name?',
    'onboarding.name.placeholder': 'Your name…',
    'onboarding.goals.title': 'What are your goals?',
    'onboarding.diet.title': 'What\'s your dietary preference?',
    'onboarding.privacy.title': 'Your privacy is sacred',
    'onboarding.privacy.body': 'All your data is encrypted locally. Your key, your information.',
    'onboarding.ready.title': 'You\'re ready!',
    'onboarding.ready.subtitle': 'Your transformation journey begins now',
    'onboarding.next': 'Next',
    'onboarding.start': 'Get Started',

    // Meals
    'meals.title': 'Meal Plan',
    'meals.generate': 'Generate Plan',
    'meals.week': 'This week',

    // Progress
    'progress.title': 'My Progress',
    'progress.weight': 'Weight',
    'progress.streak': 'Streak',
    'progress.days': 'days',

    // Brain / Notes
    'brain.title': 'Second Brain',
    'brain.new': 'New note',
    'brain.search': 'Search notes…',

    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.model': 'AI Model',
    'settings.byok': 'Bring Your Own Key',
    'settings.premium': 'Premium',
    'settings.logout': 'Sign out',
    'settings.tier.free': 'Free Plan',
    'settings.tier.premium': 'Premium Plan',

    // Voice
    'voice.listening': 'Listening…',
    'voice.processing': 'Processing…',
    'voice.error': 'Could not hear you. Please try again.',

    // General
    'general.loading': 'Loading…',
    'general.error': 'Something went wrong. Please try again.',
    'general.save': 'Save',
    'general.cancel': 'Cancel',
    'general.close': 'Close',
    'general.back': 'Back',
  },
};

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// ─── PROVIDER ────────────────────────────────────────────────────────────────

export function LanguageProvider({
  children,
  defaultLang = 'es',
}: {
  children: ReactNode;
  defaultLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('meta_lang') as Lang | null;
    return stored ?? defaultLang;
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('meta_lang', newLang);
    document.documentElement.setAttribute('lang', newLang);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return translations[lang][key] ?? translations['es'][key] ?? fallback ?? key;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
