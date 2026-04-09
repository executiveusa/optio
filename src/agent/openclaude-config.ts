/**
 * OpenClaude-style multi-model routing for Metamorfosis
 * Inspired by Gitlawb/openclaude agent routing — maps intents to providers
 * 
 * Free tier: GPT-4o-mini only (cost efficient)
 * Premium tier: Full routing — Claude for emotional/journal, GPT-4o for nutrition
 */

export type ModelProvider = 'openai' | 'anthropic' | 'ollama' | 'openrouter';

export type MetaIntent =
  | 'nutrition'
  | 'tracking'
  | 'journal'
  | 'mindfulness'
  | 'web-search'
  | 'memory'
  | 'general';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  maxTokens: number;
  temperature: number;
  /** OpenRouter model ID (when provider = openrouter) */
  openrouterModel?: string;
}

// ─── PROVIDER DEFAULTS ──────────────────────────

export const PROVIDERS: Record<string, ModelConfig> = {
  // OpenAI
  'openai-gpt4o': {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 2048,
    temperature: 0.7,
  },
  'openai-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Anthropic
  'claude-sonnet': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    maxTokens: 2048,
    temperature: 0.7,
  },
  // Ollama (local — no API key needed)
  'ollama-llama3': {
    provider: 'ollama',
    model: 'llama3:8b',
    maxTokens: 2048,
    temperature: 0.7,
  },
  // OpenRouter (any model)
  'openrouter-mixtral': {
    provider: 'openrouter',
    model: 'mistralai/mixtral-8x7b-instruct',
    maxTokens: 2048,
    temperature: 0.7,
    openrouterModel: 'mistralai/mixtral-8x7b-instruct',
  },
};

// ─── INTENT ROUTING TABLE ──────────────────────────

/**
 * Maps intents to model configs.
 * Mirrors ModelRouter::from_env() in src-rust/crates/agent-core/src/models.rs
 */
export const INTENT_ROUTING: Record<MetaIntent, keyof typeof PROVIDERS> = {
  nutrition:     'openai-gpt4o',  // GPT-4o: best food/recipe knowledge
  tracking:      'openai-mini',   // GPT-4o-mini: simple data ops, cheaper
  journal:       'claude-sonnet', // Claude: emotional intelligence & writing
  mindfulness:   'claude-sonnet', // Claude: thoughtful, non-mechanical tone
  'web-search':  'openai-gpt4o',  // GPT-4o: best web synthesis
  memory:        'openai-mini',   // Mini: CRUD + tagging, cheap
  general:       'openai-gpt4o',  // Default: GPT-4o
};

// Free tier: always use mini to reduce costs
export const FREE_TIER_MODEL: keyof typeof PROVIDERS = 'openai-mini';

// ─── CLASSIFIER ──────────────────────────

const INTENT_PATTERNS: Array<{ intent: MetaIntent; keywords: string[] }> = [
  { intent: 'nutrition',   keywords: ['receta','comida','plan','comer','cocinar','desayuno','comida','cena','ingrediente','proteína','calorías','dieta'] },
  { intent: 'tracking',    keywords: ['registrar','peso','medida','progreso','meta','seguimiento','registro','stats'] },
  { intent: 'journal',     keywords: ['sentir','diario','emoción','escribir','reflexión','cómo me siento','hoy fue','pensamiento'] },
  { intent: 'mindfulness', keywords: ['meditar','estrés','ansiedad','respirar','calmar','paz','mindfulness','medita'] },
  { intent: 'web-search',  keywords: ['buscar','investigar','qué es','estudio','artículo','noticias','información sobre'] },
  { intent: 'memory',      keywords: ['guardar','nota','recordar','anotar','apuntar','recuerda'] },
];

export function classifyIntent(input: string): MetaIntent {
  const lower = input.toLowerCase();
  for (const { intent, keywords } of INTENT_PATTERNS) {
    if (keywords.some(k => lower.includes(k))) return intent;
  }
  return 'general';
}

// ─── MODEL ROUTER ──────────────────────────

export interface RoutingDecision {
  intent: MetaIntent;
  config: ModelConfig;
  isFallback: boolean;
}

export class ModelRouter {
  private apiKeys: Partial<Record<ModelProvider, string>>;
  private userTier: 'free' | 'premium';

  constructor(
    apiKeys: Partial<Record<ModelProvider, string>> = {},
    userTier: 'free' | 'premium' = 'free'
  ) {
    this.apiKeys = apiKeys;
    this.userTier = userTier;
  }

  static fromEnv(userTier: 'free' | 'premium' = 'free'): ModelRouter {
    return new ModelRouter({
      openai: import.meta.env?.VITE_OPENAI_API_KEY,
      anthropic: import.meta.env?.VITE_ANTHROPIC_API_KEY,
      openrouter: import.meta.env?.VITE_OPENROUTER_API_KEY,
    }, userTier);
  }

  /** Get provider config for a given message */
  route(input: string): RoutingDecision {
    const intent = classifyIntent(input);
    
    // Free tier: always mini
    if (this.userTier === 'free') {
      return {
        intent,
        config: PROVIDERS[FREE_TIER_MODEL],
        isFallback: false,
      };
    }

    // Premium: use intent routing
    const targetKey = INTENT_ROUTING[intent];
    const targetConfig = PROVIDERS[targetKey];

    // Check if we have the API key for this provider
    if (this.apiKeys[targetConfig.provider]) {
      return { intent, config: targetConfig, isFallback: false };
    }

    // Fallback chain: anthropic → openai → mini → ollama
    const fallbacks: Array<keyof typeof PROVIDERS> = ['openai-gpt4o', 'openai-mini', 'ollama-llama3'];
    for (const fallbackKey of fallbacks) {
      const fallback = PROVIDERS[fallbackKey];
      if (fallback.provider === 'ollama' || this.apiKeys[fallback.provider]) {
        return { intent, config: fallback, isFallback: true };
      }
    }

    // Last resort: Ollama local
    return { intent, config: PROVIDERS['ollama-llama3'], isFallback: true };
  }

  /** Check if any provider is configured */
  isConfigured(): boolean {
    return Object.values(this.apiKeys).some(k => !!k);
  }
}

// Default export for easy import
export default ModelRouter;
