/**
 * Metamorfosis — Agent Loop
 * ─────────────────────────────────
 * Core agent loop following the copilot-sdk pattern.
 * Handles: message processing, tool dispatch, streaming, encryption.
 * Ref: https://ccunpacked.dev/#agent-loop
 */

import {
  AGENT_CONFIG,
  AGENT_TOOLS,
  type AgentMessage,
  type ConversationState,
  type ToolCall,
  type UserProfile,
} from './agent-config';
import { encrypt, decrypt, secureStore, secureRetrieve } from './encryption';

// ─── TYPES ──────────────────────────

type StreamCallback = (chunk: string) => void;
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

interface AgentLoopOptions {
  apiKey: string;
  model?: string;
  onStream?: StreamCallback;
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: unknown) => void;
  onError?: (error: Error) => void;
  encryptionKey?: CryptoKey;
}

// ─── TOOL REGISTRY ──────────────────────────

const toolHandlers = new Map<string, ToolHandler>();

export function registerTool(name: string, handler: ToolHandler): void {
  toolHandlers.set(name, handler);
}

// ─── AGENT LOOP ──────────────────────────

export async function runAgentLoop(
  userMessage: string,
  conversation: ConversationState,
  options: AgentLoopOptions,
): Promise<AgentMessage> {
  const { apiKey, onStream, onToolCall, onToolResult, onError, encryptionKey } = options;
  const model = options.model ?? AGENT_CONFIG.model;

  // Add user message to conversation
  const userMsg: AgentMessage = {
    role: 'user',
    content: userMessage,
    timestamp: Date.now(),
  };
  conversation.messages.push(userMsg);
  conversation.turnCount++;

  // Build messages array for API call
  const apiMessages = buildApiMessages(conversation);

  let turnCount = 0;
  let finalResponse: AgentMessage | null = null;

  while (turnCount < AGENT_CONFIG.maxTurns && !finalResponse) {
    turnCount++;

    try {
      const response = await callModel(apiMessages, model, apiKey, onStream);

      if (response.toolCalls && response.toolCalls.length > 0) {
        // Execute tool calls
        for (const toolCall of response.toolCalls) {
          onToolCall?.(toolCall.name, toolCall.arguments);

          const handler = toolHandlers.get(toolCall.name);
          if (handler) {
            try {
              toolCall.result = await handler(toolCall.arguments);
              onToolResult?.(toolCall.name, toolCall.result);
            } catch (err) {
              toolCall.result = { error: (err as Error).message };
              onError?.(err as Error);
            }
          } else {
            toolCall.result = { error: `Tool "${toolCall.name}" not found` };
          }

          // Add tool result to messages
          apiMessages.push({
            role: 'tool' as const,
            content: JSON.stringify(toolCall.result),
            timestamp: Date.now(),
          });
        }

        // Continue loop — agent may need another turn
        apiMessages.push({
          role: 'assistant' as const,
          content: response.content,
          timestamp: Date.now(),
          toolCalls: response.toolCalls,
        });
      } else {
        // No tool calls — this is the final response
        finalResponse = {
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      onError?.(err as Error);

      // Fallback to simpler model
      if (model !== AGENT_CONFIG.fallbackModel) {
        const fallbackResponse = await callModel(
          apiMessages,
          AGENT_CONFIG.fallbackModel,
          apiKey,
          onStream,
        );
        finalResponse = {
          role: 'assistant',
          content: fallbackResponse.content,
          timestamp: Date.now(),
        };
      } else {
        finalResponse = {
          role: 'assistant',
          content: 'Lo siento, hubo un error. ¿Puedes intentar de nuevo?',
          timestamp: Date.now(),
        };
      }
    }
  }

  if (!finalResponse) {
    finalResponse = {
      role: 'assistant',
      content: 'He alcanzado el límite de pasos. ¿Puedes reformular tu pregunta?',
      timestamp: Date.now(),
    };
  }

  // Add assistant response to conversation
  conversation.messages.push(finalResponse);

  // Persist encrypted conversation
  if (encryptionKey) {
    await secureStore(`conversation_${conversation.id}`, conversation, encryptionKey);
  }

  return finalResponse;
}

// ─── API CALL ──────────────────────────

async function callModel(
  messages: AgentMessage[],
  model: string,
  apiKey: string,
  onStream?: StreamCallback,
): Promise<AgentMessage> {
  const body = {
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    tools: AGENT_TOOLS.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    })),
    max_tokens: AGENT_CONFIG.maxTokens,
    temperature: AGENT_CONFIG.temperature,
    stream: !!onStream,
  };

  const response = await fetch(`${import.meta.env.VITE_GATEWAY_URL ?? 'http://localhost:3000'}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_GATEWAY_KEY ?? apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  if (onStream && response.body) {
    return await handleStream(response.body, onStream);
  }

  const data = await response.json();
  const choice = data.choices[0];

  const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map(
    (tc: { id: string; function: { name: string; arguments: string } }) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }),
  );

  return {
    role: 'assistant',
    content: choice.message.content ?? '',
    timestamp: Date.now(),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

// ─── STREAMING ──────────────────────────

async function handleStream(
  body: ReadableStream<Uint8Array>,
  onChunk: StreamCallback,
): Promise<AgentMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') break;

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onChunk(delta.content);
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  return {
    role: 'assistant',
    content: fullContent,
    timestamp: Date.now(),
  };
}

// ─── HELPERS ──────────────────────────

function buildApiMessages(conversation: ConversationState): AgentMessage[] {
  const systemMsg: AgentMessage = {
    role: 'system',
    content: buildSystemPrompt(conversation.userProfile),
    timestamp: Date.now(),
  };

  // Keep last N messages to stay within context window
  const recentMessages = conversation.messages.slice(-40);
  return [systemMsg, ...recentMessages];
}

function buildSystemPrompt(profile: UserProfile): string {
  let prompt = AGENT_CONFIG.systemPrompt;

  if (profile.name) {
    prompt += `\n\nLa usuaria se llama ${profile.name}.`;
  }
  if (profile.goals.length > 0) {
    prompt += `\nSus metas: ${profile.goals.join(', ')}.`;
  }
  if (profile.diet) {
    prompt += `\nDieta: ${profile.diet}.`;
  }

  return prompt;
}

// ─── CONVERSATION FACTORY ──────────────────────────

export function createConversation(userProfile: UserProfile): ConversationState {
  return {
    id: crypto.randomUUID(),
    messages: [],
    userProfile,
    activeTools: AGENT_TOOLS.map(t => t.name),
    turnCount: 0,
  };
}

// ─── VOICE INPUT ──────────────────────────

export function startVoiceInput(
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  lang = 'es-MX',
): { stop: () => void } {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    onError('Reconocimiento de voz no disponible en este navegador');
    return { stop: () => {} };
  }

  const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition;

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    onError(event.error);
  };

  recognition.start();

  return {
    stop: () => recognition.stop(),
  };
}
