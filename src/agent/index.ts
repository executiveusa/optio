/**
 * Metamorfosis Agent Module
 * ─────────────────────────────
 * Exports the complete agent system:
 * - Agent loop (conversation engine)
 * - Tool definitions & handlers
 * - Encryption utilities
 * - Configuration
 */

// Register all tools first
import './tools';

// Core exports
export { runAgentLoop, createConversation, registerTool, startVoiceInput } from './agent-loop';
export { deriveKey, encrypt, decrypt, secureStore, secureRetrieve, storeApiKey, getApiKey } from './encryption';
export { AGENT_CONFIG, AGENT_TOOLS, ENCRYPTION_CONFIG, CRON_JOBS, MCP_CONFIG, GATEWAY_CONFIG } from './agent-config';
export type { AgentMessage, ConversationState, ToolCall, MediaAttachment, UserProfile } from './agent-config';

/** Call once at app startup to register all tool handlers. */
export function initializeTools(): void {
  // Tools are auto-registered by importing ./tools (done above at module level)
  // This function exists so callers have an explicit initialization point.
}

