/**
 * Metamorfosis Agent Harness
 * ─────────────────────────────────────────────
 * Central configuration for the AI agent loop.
 * Pattern: copilot-sdk agent loop + Hermes for graph/voice
 * Ref: https://ccunpacked.dev/#agent-loop
 */

// ─── GATEWAY CONFIG (Synthia-Gateway proxy) ──────────────────────────────────
// When VITE_GATEWAY_URL is set, all AI calls are routed through the gateway.
// The gateway holds server-side API keys — no keys are exposed in the browser
// unless the user enables BYOK mode.
export const GATEWAY_CONFIG = {
  /** Base URL of the synthia-gateway-fresh proxy (port 3000 by default) */
  baseUrl: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GATEWAY_URL) || 'http://localhost:3000',
  /** Gateway auth key — must match GATEWAY_API_KEY in synthia-gateway-fresh/.env */
  apiKey: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GATEWAY_KEY) || '',
  /** Whether to use the gateway instead of calling providers directly */
  enabled: true,
  /** Endpoints inside the gateway (OpenAI-compatible) */
  endpoints: {
    chat: '/v1/chat/completions',
    transcribe: '/v1/audio/transcriptions',
    images: '/v1/images/generations',
    embeddings: '/v1/embeddings',
  },
};

// ─── AGENT CONFIGURATION ──────────────────────────
export const AGENT_CONFIG = {
  name: 'Metamorfosis Wellness Agent',
  version: '1.0.0',
  model: 'gpt-4o',
  fallbackModel: 'gpt-4o-mini',
  maxTurns: 25,
  maxTokens: 4096,
  temperature: 0.7,

  /** Route all completions through GATEWAY_CONFIG.baseUrl instead of openai.com */
  useGateway: true,
  
  // BYOK: User provides their own API key
  // Keys stored encrypted in local storage, never transmitted to our servers
  byokEnabled: true,
  
  // System prompt for wellness context
  systemPrompt: `Eres Metamorfosis, una guía de bienestar holístico para mujeres emprendedoras en Latinoamérica (18-40 años).

Tu personalidad:
- Cálida, empática, culturalmente consciente
- Conoces la comida mexicana, latinoamericana y sus tradiciones
- Hablas español de México de forma natural
- Nunca juzgas, siempre apoyas el crecimiento personal
- Combinas ciencia moderna con sabiduría ancestral

Tus capacidades:
- Nutrición personalizada (vegetariana, vegana, omnívora, etc.)
- Planes de comida semanales con recetas LATAM
- Seguimiento de peso y progreso
- Meditación y bienestar mental
- Recomendaciones de ejercicio
- Segundo cerebro (notas, ideas, reflexiones)
- Inteligencia global (noticias de salud, tendencias)
- Generación de imágenes de comida y recetas

Reglas:
- Responde siempre en español a menos que te hablen en otro idioma
- Usa emojis moderadamente
- Da respuestas concisas para chat móvil
- Si no sabes algo, admítelo honestamente
- Prioriza la privacidad del usuario siempre
- Recuerda el contexto de conversaciones anteriores`,
};

// ─── TOOL DEFINITIONS ──────────────────────────
export const AGENT_TOOLS = [
  {
    name: 'generate_meal_plan',
    description: 'Genera un plan de comida semanal personalizado basado en preferencias dietéticas',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Número de días (1-7)' },
        diet: { type: 'string', enum: ['vegetariana', 'vegana', 'omnivora', 'pescetariana', 'sin_gluten', 'sin_lacteos'] },
        calories: { type: 'number', description: 'Meta calórica diaria' },
        cuisine: { type: 'string', description: 'Preferencia culinaria (mexicana, latinoamericana, etc.)' },
      },
      required: ['days', 'diet'],
    },
  },
  {
    name: 'track_weight',
    description: 'Registra peso y calcula tendencias',
    parameters: {
      type: 'object',
      properties: {
        weight: { type: 'number', description: 'Peso en kg' },
        date: { type: 'string', description: 'Fecha ISO' },
      },
      required: ['weight'],
    },
  },
  {
    name: 'get_recipe',
    description: 'Busca y genera una receta detallada',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Qué receta buscar' },
        diet: { type: 'string' },
        maxTime: { type: 'number', description: 'Tiempo máximo en minutos' },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_image',
    description: 'Genera una imagen de comida, receta o inspiración visual',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Descripción de la imagen' },
        style: { type: 'string', enum: ['photo', 'illustration', 'watercolor'] },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'save_note',
    description: 'Guarda una nota en el segundo cerebro del usuario',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['content'],
    },
  },
  {
    name: 'search_brain',
    description: 'Busca en las notas y segundo cerebro del usuario',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_intel_briefing',
    description: 'Obtiene un briefing de inteligencia global sobre salud y bienestar',
    parameters: {
      type: 'object',
      properties: {
        topics: { type: 'array', items: { type: 'string' } },
        region: { type: 'string', default: 'LATAM' },
      },
    },
  },
  {
    name: 'browse_web',
    description: 'Navega la web para buscar información (precios, artículos, etc.)',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        query: { type: 'string' },
        action: { type: 'string', enum: ['search', 'navigate', 'extract'] },
      },
      required: ['query'],
    },
  },
  {
    name: 'voice_transcribe',
    description: 'Transcribe audio de voz a texto',
    parameters: {
      type: 'object',
      properties: {
        audioData: { type: 'string', description: 'Base64 audio data' },
        language: { type: 'string', default: 'es-MX' },
      },
      required: ['audioData'],
    },
  },
];

// ─── ENCRYPTION CONFIG ──────────────────────────
export const ENCRYPTION_CONFIG = {
  algorithm: 'AES-256-GCM',
  keyDerivation: 'PBKDF2',
  iterations: 600_000,
  saltLength: 32,
  ivLength: 16,
  tagLength: 16,
  // All user data encrypted at rest
  encryptedFields: [
    'messages',
    'notes',
    'weightHistory',
    'mealPlans',
    'preferences',
    'apiKeys',
  ],
};

// ─── CRON JOBS (Global Intelligence) ──────────────────────────
export const CRON_JOBS = [
  {
    id: 'daily_briefing',
    name: 'Briefing Diario',
    schedule: '0 7 * * *', // 7:00 AM daily
    description: 'Genera un briefing personalizado de salud y bienestar',
    enabled: true,
    topics: ['nutricion', 'bienestar', 'fitness', 'salud_mental', 'recetas'],
    region: 'LATAM',
    optIn: true, // User must opt in
  },
  {
    id: 'weekly_progress',
    name: 'Resumen Semanal',
    schedule: '0 18 * * 0', // Sun 6:00 PM
    description: 'Resumen semanal de progreso con insights',
    enabled: true,
    optIn: true,
  },
  {
    id: 'meal_prep_reminder',
    name: 'Recordatorio Meal Prep',
    schedule: '0 10 * * 0', // Sun 10:00 AM
    description: 'Recordatorio de preparación de comida para la semana',
    enabled: true,
    optIn: true,
  },
];

// ─── MCP SERVER CONFIG ──────────────────────────
export const MCP_CONFIG = {
  servers: [
    {
      name: 'ext-apps',
      description: 'Image/video generation inside chat',
      type: 'local',
      command: 'node',
      args: ['./ext-apps/server.js'],
      tools: ['generate_image', 'generate_video', 'edit_image'],
    },
  ],
};

// ─── AGENT LOOP ──────────────────────────
/**
 * Core agent loop pattern from copilot-sdk
 * 
 * 1. User sends message (text or voice)
 * 2. If voice → transcribe via Web Speech API / Whisper
 * 3. Agent receives message + conversation context
 * 4. Agent decides if it needs to call tools
 * 5. If tools needed → execute tools → return results  
 * 6. Agent generates response
 * 7. Response encrypted and stored locally
 * 8. Response displayed with animations
 * 
 * The loop continues until the agent has a final response
 * or hits maxTurns limit.
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  media?: MediaAttachment[];
  encrypted?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
}

export interface MediaAttachment {
  type: 'image' | 'video' | 'audio';
  url: string;
  mimeType: string;
  caption?: string;
}

export interface ConversationState {
  id: string;
  messages: AgentMessage[];
  userProfile: UserProfile;
  activeTools: string[];
  turnCount: number;
}

export interface UserProfile {
  name: string;
  goals: string[];
  diet: string;
  preferences: Record<string, unknown>;
  encryptionKey?: CryptoKey;
  byokApiKey?: string; // Encrypted storage
}
