/**
 * AI Journal — client-side journal with AI memory & mood tracking
 * JournAI-inspired, custom implementation for Metamorfosis
 */

import { encrypt, decrypt, secureStore, secureRetrieve } from './encryption';

// ─── TYPES ──────────────────────────

export type Mood = 'excelente' | 'bien' | 'regular' | 'bajo' | 'difícil';

export const MOOD_EMOJIS: Record<Mood, string> = {
  excelente: '😁',
  bien: '😊',
  regular: '😐',
  bajo: '😔',
  difícil: '😰',
};

export const MOOD_LABELS: Record<Mood, string> = {
  excelente: 'Excelente',
  bien: 'Bien',
  regular: 'Regular',
  bajo: 'Bajo',
  difícil: 'Difícil',
};

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: Mood;
  tags: string[];
  /** AI-generated insights for this entry */
  aiInsights?: string;
  /** Whether this entry is saved to AI memory (searchable by Sofía) */
  savedToMemory: boolean;
  isVoice: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface JournalWriteState {
  title: string;
  content: string;
  mood?: Mood;
  tags: string[];
  savedToMemory: boolean;
  aiPrompt?: string;
}

// ─── AIR PROMPTS (Sofía asks these when you open the journal) ──────────────────

export const AI_JOURNAL_PROMPTS = [
  '¿Cómo te sientes hoy en tu cuerpo?',
  '¿Qué te dio más energía hoy?',
  '¿Hay algo que quieras dejar ir?',
  '¿Qué te orgullece de esta semana?',
  '¿Cómo estuvo tu alimentación hoy?',
  '¿Qué necesitas mañana que no tuviste hoy?',
  '¿Qué momento de hoy quieres recordar?',
  '¿Cómo describirías tu nivel de estrés esta semana?',
  '¿Qué pequeño avance celebras hoy?',
  '¿Hay una emoción que no has podido procesar esta semana?',
];

export function getTodaysPrompt(): string {
  const dayIndex = new Date().getDay(); // 0-6
  const extended = [...AI_JOURNAL_PROMPTS];
  return extended[dayIndex % extended.length];
}

// ─── AUTO-TAGGING ──────────────────────────

const TAG_KEYWORDS: Array<{ tag: string; keywords: string[] }> = [
  { tag: 'nutrición',  keywords: ['comí','comida','comer','receta','desayuno','almuerzo','cena','hambre','saciedad'] },
  { tag: 'energía',    keywords: ['cansada','energía','agotada','descansé','dormí','sueño','activa'] },
  { tag: 'estrés',     keywords: ['estrés','ansiosa','preocupada','angustia','nervios','trabajo','presión'] },
  { tag: 'cuerpo',     keywords: ['peso','medida','ejercicio','moví','caminé','yoga','cuerpo','dolor'] },
  { tag: 'emociones',  keywords: ['sentí','emoción','lloré','reí','feliz','triste','alegría','enojo'] },
  { tag: 'metas',      keywords: ['meta','objetivo','logré','avancé','conseguí','pendiente','próxima'] },
  { tag: 'gratitud',   keywords: ['agradecida','gratitud','bendecida','afortunada','gracias'] },
  { tag: 'relaciones', keywords: ['pareja','mamá','papá','amiga','familia','hija','hijo','relación'] },
];

export function autoTag(content: string): string[] {
  const lower = content.toLowerCase();
  return TAG_KEYWORDS
    .filter(({ keywords }) => keywords.some(k => lower.includes(k)))
    .map(({ tag }) => tag);
}

// ─── JOURNAL STORE ──────────────────────────

const JOURNAL_KEY = 'metamorfosis_journal';

export class JournalStore {
  private entries: JournalEntry[] = [];
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await secureRetrieve(JOURNAL_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
      }
    } catch {
      this.entries = [];
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await secureStore(JOURNAL_KEY, JSON.stringify(this.entries));
  }

  async list(): Promise<JournalEntry[]> {
    await this.load();
    return [...this.entries].sort((a, b) => b.createdAt - a.createdAt);
  }

  async save(entry: JournalEntry): Promise<void> {
    await this.load();
    const idx = this.entries.findIndex(e => e.id === entry.id);
    if (idx >= 0) {
      this.entries[idx] = { ...entry, updatedAt: Date.now() };
    } else {
      this.entries.unshift(entry);
    }
    await this.persist();
  }

  async delete(id: string): Promise<void> {
    await this.load();
    this.entries = this.entries.filter(e => e.id !== id);
    await this.persist();
  }

  async search(query: string): Promise<JournalEntry[]> {
    await this.load();
    const lower = query.toLowerCase();
    return this.entries.filter(e =>
      e.title.toLowerCase().includes(lower) ||
      e.content.toLowerCase().includes(lower) ||
      e.tags.some(t => t.includes(lower))
    );
  }

  /** Entries with savedToMemory=true — exposed to Sofía's search */
  async getMemoryEntries(): Promise<JournalEntry[]> {
    await this.load();
    return this.entries
      .filter(e => e.savedToMemory)
      .slice(0, 20); // last 20 for context
  }

  /** Format last N memory entries as context for Sofía */
  async toContextString(limit = 5): Promise<string> {
    const entries = await this.getMemoryEntries();
    if (entries.length === 0) return '';
    return entries.slice(0, limit).map(e => {
      const date = new Date(e.createdAt).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' });
      const mood = e.mood ? MOOD_LABELS[e.mood] : '';
      return `[${date}${mood ? ` — ${mood}` : ''}] ${e.title}: ${e.content.slice(0, 200)}`;
    }).join('\n\n');
  }
}

// Singleton
export const journalStore = new JournalStore();

// ─── ENTRY FACTORY ──────────────────────────

export function createEntry(partial: Partial<JournalEntry> = {}): JournalEntry {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    tags: [],
    savedToMemory: true,
    isVoice: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/** Create a new entry from the write form state */
export function entryFromWriteState(state: JournalWriteState): JournalEntry {
  const content = state.content.trim();
  const tags = [...new Set([...state.tags, ...autoTag(content)])];
  const title = state.title.trim() || content.slice(0, 50) + (content.length > 50 ? '…' : '');

  return createEntry({
    title,
    content,
    mood: state.mood,
    tags,
    savedToMemory: state.savedToMemory,
  });
}

// ─── RELATIVE DATE ──────────────────────────

export function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins || 1} min`;
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return new Date(ts).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}
