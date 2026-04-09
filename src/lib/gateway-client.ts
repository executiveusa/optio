/**
 * Synthia Gateway Client
 * ────────────────────────────────────────
 * TypeScript wrapper for calling the synthia-gateway LLM proxy.
 * Routes all AI requests through the gateway so provider keys
 * stay server-side and subscriptions are shared.
 *
 * Gateway runs on: http://localhost:3000 (dev)
 * OpenAI-compatible: /v1/chat/completions
 */

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface GatewayTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GatewayChatRequest {
  model?: string;
  messages: GatewayMessage[];
  tools?: GatewayTool[];
  tool_choice?: 'auto' | 'none' | string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface GatewayChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }>;
  };
  finish_reason: string;
}

export interface GatewayChatResponse {
  id: string;
  object: string;
  model: string;
  choices: GatewayChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

// ─── CLIENT ──────────────────────────────────────────────────────────────────

export class GatewayClient {
  private readonly baseUrl: string;
  private readonly gatewayKey: string;
  private readonly defaultModel: string;

  constructor(options?: {
    baseUrl?: string;
    gatewayKey?: string;
    defaultModel?: string;
  }) {
    this.baseUrl = (options?.baseUrl ?? import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    this.gatewayKey = options?.gatewayKey ?? import.meta.env.VITE_GATEWAY_KEY ?? '';
    this.defaultModel = options?.defaultModel ?? 'gpt-4o';
  }

  private headers(): HeadersInit {
    const h: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.gatewayKey) {
      h['Authorization'] = `Bearer ${this.gatewayKey}`;
    }
    // Provider hint: optional X-Provider header for explicit routing
    return h;
  }

  /** Non-streaming chat completion */
  async chat(request: GatewayChatRequest): Promise<GatewayChatResponse> {
    const body: GatewayChatRequest = {
      model: request.model ?? this.defaultModel,
      ...request,
      stream: false,
    };

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gateway error ${res.status}: ${err}`);
    }

    return res.json() as Promise<GatewayChatResponse>;
  }

  /** Streaming chat — calls onChunk for each SSE text delta */
  async chatStream(
    request: GatewayChatRequest,
    onChunk: (delta: string) => void,
    onDone?: () => void,
  ): Promise<void> {
    const body: GatewayChatRequest = {
      model: request.model ?? this.defaultModel,
      ...request,
      stream: true,
    };

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gateway stream error ${res.status}: ${err}`);
    }

    if (!res.body) throw new Error('No response body for streaming');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const data = trimmed.slice('data:'.length).trim();
          if (data === '[DONE]') {
            onDone?.();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    onDone?.();
  }

  /** Health check */
  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

// ─── SINGLETON ───────────────────────────────────────────────────────────────

export const gatewayClient = new GatewayClient();
