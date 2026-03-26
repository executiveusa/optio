export enum InteractiveSessionState {
  ACTIVE = "active",
  ENDED = "ended",
}

export interface InteractiveSession {
  id: string;
  repoUrl: string;
  userId: string | null;
  worktreePath: string | null;
  branch: string;
  state: InteractiveSessionState;
  podId: string | null;
  costUsd: string | null;
  createdAt: string;
  endedAt: string | null;
}

export interface SessionPr {
  id: string;
  sessionId: string;
  prUrl: string;
  prNumber: number;
  prState: string | null; // "open" | "merged" | "closed"
  prChecksStatus: string | null; // "pending" | "passing" | "failing" | "none"
  prReviewStatus: string | null; // "approved" | "changes_requested" | "pending" | "none"
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionInput {
  repoUrl: string;
}

// ── Chat types ──────────────────────────────────────────────────────────────

export type ChatAgentStatus = "idle" | "thinking" | "responding";

/** Client → Server messages on WS /ws/sessions/:id/chat */
export type ChatClientMessage = { type: "message"; content: string } | { type: "interrupt" };

/** Server → Client messages on WS /ws/sessions/:id/chat */
export type ChatServerMessage =
  | ChatEventMessage
  | ChatStatusMessage
  | ChatCostMessage
  | ChatErrorMessage
  | ChatHistoryMessage;

export interface ChatEventMessage {
  type: "chat:event";
  role: "user" | "assistant";
  eventType: "text" | "tool_use" | "tool_result" | "thinking" | "system" | "error" | "info";
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ChatStatusMessage {
  type: "chat:status";
  status: ChatAgentStatus;
}

export interface ChatCostMessage {
  type: "chat:cost";
  totalCostUsd: string;
  messageCostUsd?: string;
}

export interface ChatErrorMessage {
  type: "chat:error";
  message: string;
}

export interface ChatHistoryMessage {
  type: "chat:history";
  messages: ChatEventMessage[];
}
