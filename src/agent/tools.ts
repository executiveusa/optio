/**
 * Metamorfosis — Agent Tools
 * ────────────────────────────────
 * Implementations for all agent tools.
 * Each tool is registered with the agent loop.
 */

import { registerTool } from './agent-loop';
import { secureStore, secureRetrieve } from './encryption';

// ─── MEAL PLAN GENERATOR ──────────────────────────

interface MealPlanResult {
  days: DayPlan[];
  totalCalories: number;
  generatedAt: number;
}

interface DayPlan {
  day: string;
  meals: Meal[];
}

interface Meal {
  name: string;
  type: 'desayuno' | 'comida' | 'cena' | 'snack';
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  prepTime: number;
  ingredients: string[];
}

// Curated LATAM recipe bank (subset — full list would come from API/DB)
const RECIPE_BANK: Record<string, Meal[]> = {
  vegetariana: [
    { name: 'Avena tropical con mango', type: 'desayuno', description: 'Avena con leche de coco, mango fresco, chía y miel de agave', calories: 320, protein: 12, carbs: 45, prepTime: 15, ingredients: ['avena', 'leche de coco', 'mango', 'chía', 'miel de agave'] },
    { name: 'Chilaquiles verdes con huevo', type: 'desayuno', description: 'Chilaquiles con salsa verde, huevo, crema, queso fresco', calories: 380, protein: 18, carbs: 35, prepTime: 20, ingredients: ['tortillas', 'salsa verde', 'huevo', 'crema', 'queso fresco'] },
    { name: 'Smoothie verde proteico', type: 'desayuno', description: 'Espinaca, plátano, proteína de hemp, leche de almendra', calories: 280, protein: 22, carbs: 30, prepTime: 5, ingredients: ['espinaca', 'plátano', 'proteína de hemp', 'leche de almendra'] },
    { name: 'Ensalada de lentejas con nopales', type: 'comida', description: 'Lentejas, nopales, limón, cilantro, aguacate', calories: 420, protein: 24, carbs: 52, prepTime: 30, ingredients: ['lentejas', 'nopales', 'limón', 'cilantro', 'aguacate'] },
    { name: 'Tacos de coliflor al pastor', type: 'cena', description: 'Coliflor marinada al pastor, piña, cebolla, salsa verde', calories: 380, protein: 14, carbs: 48, prepTime: 35, ingredients: ['coliflor', 'achiote', 'piña', 'cebolla', 'tortillas de maíz'] },
    { name: 'Pozole verde vegano', type: 'cena', description: 'Pozole con hongos, pepitas, lechuga, rábano', calories: 350, protein: 16, carbs: 42, prepTime: 40, ingredients: ['maíz pozolero', 'hongos', 'pepitas', 'tomatillo', 'lechuga'] },
    { name: 'Fruta con yogurt y granola', type: 'snack', description: 'Yogurt griego con papaya, granola casera', calories: 180, protein: 10, carbs: 22, prepTime: 5, ingredients: ['yogurt griego', 'papaya', 'granola'] },
  ],
  omnivora: [
    { name: 'Huevos rancheros', type: 'desayuno', description: 'Huevos fritos sobre tortilla con salsa ranchera y frijoles', calories: 420, protein: 22, carbs: 38, prepTime: 20, ingredients: ['huevos', 'tortillas', 'salsa ranchera', 'frijoles'] },
    { name: 'Pollo con mole oaxaqueño', type: 'comida', description: 'Pechuga de pollo con mole negro, arroz y tortillas', calories: 520, protein: 35, carbs: 42, prepTime: 45, ingredients: ['pollo', 'mole negro', 'arroz', 'tortillas'] },
    { name: 'Ceviche de camarón', type: 'cena', description: 'Camarón en limón, aguacate, pepino, cebolla morada', calories: 280, protein: 28, carbs: 12, prepTime: 25, ingredients: ['camarón', 'limón', 'aguacate', 'pepino', 'cebolla morada'] },
  ],
};

registerTool('generate_meal_plan', async (args) => {
  const { days = 7, diet = 'vegetariana', calories = 1800 } = args as { days?: number; diet?: string; calories?: number };
  const recipes = RECIPE_BANK[diet] ?? RECIPE_BANK.vegetariana;
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const plan: DayPlan[] = [];
  for (let i = 0; i < Math.min(days, 7); i++) {
    const desayunos = recipes.filter(r => r.type === 'desayuno');
    const comidas = recipes.filter(r => r.type === 'comida');
    const cenas = recipes.filter(r => r.type === 'cena');
    const snacks = recipes.filter(r => r.type === 'snack');

    plan.push({
      day: dayNames[i],
      meals: [
        desayunos[i % desayunos.length],
        comidas[i % comidas.length],
        cenas[i % cenas.length],
        ...(snacks.length > 0 ? [snacks[i % snacks.length]] : []),
      ],
    });
  }

  return {
    days: plan,
    totalCalories: plan.reduce((sum, d) => sum + d.meals.reduce((ms, m) => ms + m.calories, 0), 0),
    generatedAt: Date.now(),
  } satisfies MealPlanResult;
});

// ─── WEIGHT TRACKER ──────────────────────────

interface WeightEntry {
  weight: number;
  date: string;
  timestamp: number;
}

const weightHistory: WeightEntry[] = [];

registerTool('track_weight', async (args) => {
  const { weight, date } = args as { weight: number; date?: string };
  const entry: WeightEntry = {
    weight,
    date: date ?? new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
  };

  weightHistory.push(entry);

  const sorted = [...weightHistory].sort((a, b) => a.timestamp - b.timestamp);
  const trend = sorted.length >= 2
    ? sorted[sorted.length - 1].weight - sorted[sorted.length - 2].weight
    : 0;

  return {
    recorded: entry,
    history: sorted.slice(-14), // Last 14 entries
    trend: {
      direction: trend < 0 ? 'bajando' : trend > 0 ? 'subiendo' : 'estable',
      change: Math.abs(trend).toFixed(1) + ' kg',
    },
    totalEntries: sorted.length,
  };
});

// ─── RECIPE SEARCH ──────────────────────────

registerTool('get_recipe', async (args) => {
  const { query, diet, maxTime } = args as { query: string; diet?: string; maxTime?: number };
  const allRecipes = Object.values(RECIPE_BANK).flat();

  const matches = allRecipes.filter(r => {
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase())
      || r.description.toLowerCase().includes(query.toLowerCase())
      || r.ingredients.some(i => i.toLowerCase().includes(query.toLowerCase()));
    const matchesTime = maxTime ? r.prepTime <= maxTime : true;
    return matchesQuery && matchesTime;
  });

  return {
    results: matches.slice(0, 5),
    query,
    totalFound: matches.length,
  };
});

// ─── IMAGE GENERATION (stub — routes to MCP ext-apps) ──────────────────────────

registerTool('generate_image', async (args) => {
  const { prompt, style = 'photo' } = args as { prompt: string; style?: string };
  // In production, this routes to the MCP ext-apps server
  // For now, return a placeholder
  return {
    url: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80`,
    prompt,
    style,
    note: 'Placeholder — MCP ext-apps integration pending',
  };
});

// ─── BRAIN / NOTES ──────────────────────────

interface BrainNote {
  id: string;
  title?: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

const brainNotes: BrainNote[] = [];

registerTool('save_note', async (args) => {
  const { title, content, tags = [] } = args as { title?: string; content: string; tags?: string[] };
  const note: BrainNote = {
    id: crypto.randomUUID(),
    title: title ?? content.slice(0, 50),
    content,
    tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  brainNotes.push(note);
  return { saved: note, totalNotes: brainNotes.length };
});

registerTool('search_brain', async (args) => {
  const { query } = args as { query: string };
  const q = query.toLowerCase();

  const matches = brainNotes.filter(n =>
    n.content.toLowerCase().includes(q)
    || (n.title?.toLowerCase().includes(q))
    || n.tags.some(t => t.toLowerCase().includes(q)),
  );

  return {
    results: matches.slice(0, 10),
    query,
    totalFound: matches.length,
  };
});

// ─── GLOBAL INTELLIGENCE BRIEFING ──────────────────────────

registerTool('get_intel_briefing', async (args) => {
  const { topics = ['nutricion', 'bienestar'], region = 'LATAM' } = args as { topics?: string[]; region?: string };

  // In production, this uses worldmonitor pattern + web search
  const briefings = [
    {
      topic: 'nutricion',
      title: 'Nuevo estudio sobre ayuno intermitente para mujeres',
      summary: 'Investigadores de la UNAM revelan beneficios específicos del ayuno 16:8 para mujeres en edad reproductiva, con mejoras en sensibilidad a la insulina.',
      source: 'Revista de Nutrición UNAM',
      relevance: 0.92,
      timestamp: Date.now(),
    },
    {
      topic: 'bienestar',
      title: 'Técnica de respiración 4-7-8 para emprendedoras',
      summary: 'Un estudio confirma que 3 minutos de respiración controlada reduce cortisol un 23% entre reuniones de trabajo.',
      source: 'Journal of Wellness',
      relevance: 0.88,
      timestamp: Date.now(),
    },
    {
      topic: 'fitness',
      title: 'Microdosis de ejercicio: 5 minutos que transforman tu día',
      summary: 'Investigación de Stanford muestra que 5 minutos de ejercicio de alta intensidad son suficientes para mejorar el estado de ánimo.',
      source: 'Stanford Medicine',
      relevance: 0.85,
      timestamp: Date.now(),
    },
  ];

  return {
    briefings: briefings.filter(b => topics.includes(b.topic)),
    region,
    generatedAt: Date.now(),
    note: 'Placeholder — worldmonitor cron integration pending',
  };
});

// ─── WEB BROWSING (stub — agent browser) ──────────────────────────

registerTool('browse_web', async (args) => {
  const { query, action = 'search' } = args as { url?: string; query: string; action?: string };
  return {
    action,
    query,
    results: [],
    note: 'Agent browser integration pending — Hermes agent handles actual browsing',
  };
});

// ─── VOICE TRANSCRIPTION (using Web Speech API) ──────────────────────────

registerTool('voice_transcribe', async (args) => {
  const { language = 'es-MX' } = args as { audioData: string; language?: string };
  return {
    transcript: '',
    language,
    note: 'Voice transcription handled client-side via Web Speech API',
  };
});
