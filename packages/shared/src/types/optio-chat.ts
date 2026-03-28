/** Tool definition for the Optio chat agent */
export interface OptioChatTool {
  name: string;
  description: string;
  /** Whether this tool requires user confirmation before execution */
  requiresConfirmation: boolean;
  parameters?: Record<string, unknown>;
}

/** An action the agent wants to perform (sent for user confirmation) */
export interface OptioActionProposal {
  description: string;
  details?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Client → Server messages
// ---------------------------------------------------------------------------

export type OptioChatClientMessage =
  | { type: "message"; content: string; conversationContext?: OptioChatMessage[] }
  | { type: "approve" }
  | { type: "decline" }
  | { type: "interrupt" };

// ---------------------------------------------------------------------------
// Server → Client messages
// ---------------------------------------------------------------------------

export type OptioChatServerMessage =
  | { type: "text"; content: string }
  | { type: "action_proposal"; actions: OptioActionProposal[] }
  | { type: "action_result"; success: boolean; summary: string }
  | { type: "error"; message: string }
  | { type: "status"; status: OptioChatStatus };

export type OptioChatStatus = "thinking" | "executing" | "waiting_for_approval" | "idle" | "ready";

/** A message in the conversation context (managed client-side) */
export interface OptioChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Read-only vs write tool registry
// ---------------------------------------------------------------------------

/** Built-in Optio tool definitions with confirmation requirements */
export const OPTIO_TOOLS: OptioChatTool[] = [
  // --- Read-only (no confirmation) ---
  {
    name: "list_tasks",
    description: "List tasks with optional filters",
    requiresConfirmation: false,
  },
  { name: "get_task", description: "Get details of a specific task", requiresConfirmation: false },
  {
    name: "get_task_logs",
    description: "Get logs for a specific task",
    requiresConfirmation: false,
  },
  { name: "list_repos", description: "List configured repositories", requiresConfirmation: false },
  { name: "get_repo", description: "Get details of a specific repo", requiresConfirmation: false },
  { name: "list_sessions", description: "List interactive sessions", requiresConfirmation: false },
  {
    name: "get_cluster_status",
    description: "Get cluster/pod status",
    requiresConfirmation: false,
  },
  { name: "get_costs", description: "Get cost analytics", requiresConfirmation: false },
  {
    name: "list_secrets",
    description: "List secret names (not values)",
    requiresConfirmation: false,
  },
  { name: "watch_task", description: "Watch a task's live status", requiresConfirmation: false },
  // --- Write operations (confirmation required) ---
  { name: "create_task", description: "Create a new task", requiresConfirmation: true },
  { name: "retry_task", description: "Retry a failed task", requiresConfirmation: true },
  {
    name: "cancel_task",
    description: "Cancel a running or queued task",
    requiresConfirmation: true,
  },
  { name: "update_repo", description: "Update repository settings", requiresConfirmation: true },
  { name: "bulk_retry_failed", description: "Retry all failed tasks", requiresConfirmation: true },
  {
    name: "bulk_cancel_active",
    description: "Cancel all active tasks",
    requiresConfirmation: true,
  },
  {
    name: "assign_issue",
    description: "Assign a GitHub issue to Optio",
    requiresConfirmation: true,
  },
  {
    name: "create_session",
    description: "Create an interactive session",
    requiresConfirmation: true,
  },
  { name: "resume_task", description: "Resume a paused/failed task", requiresConfirmation: true },
];

/** Check whether a tool requires user confirmation */
export function toolRequiresConfirmation(toolName: string): boolean {
  const tool = OPTIO_TOOLS.find((t) => t.name === toolName);
  // Default to requiring confirmation for unknown tools
  return tool?.requiresConfirmation ?? true;
}
