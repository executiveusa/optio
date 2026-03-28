import type { FastifyInstance } from "fastify";
import { logger } from "../logger.js";
import { authenticateWs } from "./ws-auth.js";
import { parseClaudeEvent } from "../services/agent-event-parser.js";
import { execInOptioPod, isOptioPodReady } from "../services/optio-pod-service.js";
import { getSystemStatusSummary } from "../services/optio-chat-service.js";
import type { ExecSession } from "@optio/shared";
import type {
  OptioChatClientMessage,
  OptioChatServerMessage,
  OptioChatMessage,
  OptioActionProposal,
} from "@optio/shared";
import { toolRequiresConfirmation } from "@optio/shared";

/**
 * Optio chat WebSocket handler.
 *
 * Relays chat messages between the browser and the Optio pod.
 * Each user message spawns a new `claude -p` invocation.
 *
 * Client → Server messages:
 *   { type: "message", content: string, conversationContext?: [...] }
 *   { type: "approve" }
 *   { type: "decline" }
 *   { type: "interrupt" }
 *
 * Server → Client messages:
 *   { type: "text", content: string }
 *   { type: "action_proposal", actions: [...] }
 *   { type: "action_result", success: boolean, summary: string }
 *   { type: "error", message: string }
 *   { type: "status", status: "thinking" | "executing" | "waiting_for_approval" | "idle" | "ready" }
 */

/** Track active conversations per user (userId → true) */
const activeConversations = new Map<string, boolean>();

export async function optioChatWs(app: FastifyInstance) {
  app.get("/ws/optio/chat", { websocket: true }, async (socket, req) => {
    const log = logger.child({ ws: "optio-chat" });

    // Authenticate
    const user = await authenticateWs(socket, req);
    if (!user) return;

    const userId = user.id;
    log.info({ userId, email: user.email }, "Optio chat connected");

    // Enforce one active conversation per user
    if (activeConversations.get(userId)) {
      send({ type: "error", message: "You already have an active Optio conversation" });
      socket.close(4409, "Concurrent conversation");
      return;
    }
    activeConversations.set(userId, true);

    let execSession: ExecSession | null = null;
    let isProcessing = false;
    let outputBuffer = "";
    let pendingActions: OptioActionProposal[] | null = null;
    let lastConversationContext: OptioChatMessage[] = [];

    function send(msg: OptioChatServerMessage) {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(msg));
      }
    }

    // Send initial ready status
    send({ type: "status", status: "ready" });

    /**
     * Build the system prompt for the Optio assistant.
     * Includes persona, tool definitions, and live system status.
     */
    async function buildSystemPrompt(): Promise<string> {
      const systemStatus = await getSystemStatusSummary().catch(() => "System status unavailable.");

      return `You are Optio, an AI assistant that helps users manage their coding agent workflows.
You have access to the Optio system — a platform that orchestrates AI coding agents.

## Your capabilities
You can help users with:
- Listing, creating, retrying, and cancelling tasks
- Viewing task logs and status
- Managing repositories and their settings
- Viewing cluster status and pod health
- Checking cost analytics
- Assigning GitHub issues to Optio agents
- Creating and managing interactive sessions

## Current system status
${systemStatus}

## Important rules
1. When the user asks you to perform a write operation (create, retry, cancel, update, assign, etc.), you MUST output a structured action proposal in the following JSON format on a single line:

ACTION_PROPOSAL: {"actions": [{"description": "Human-readable description", "details": "Additional context", "toolName": "tool_name", "toolInput": {}}]}

2. For read operations (list, get, check, view, etc.), provide the information directly — no confirmation needed.
3. Be concise and helpful. Use markdown formatting for readability.
4. When listing items, use tables or bullet points.
5. If you encounter an error, explain what went wrong and suggest next steps.
6. Never make up data — only report what the system tells you.

## Available tools and their confirmation requirements
Read-only (no confirmation): list_tasks, get_task, get_task_logs, list_repos, get_repo, list_sessions, get_cluster_status, get_costs, list_secrets, watch_task
Write operations (requires confirmation): create_task, retry_task, cancel_task, update_repo, bulk_retry_failed, bulk_cancel_active, assign_issue, create_session, resume_task`;
    }

    /**
     * Build the full prompt including conversation context.
     */
    function buildPrompt(
      systemPrompt: string,
      userMessage: string,
      context: OptioChatMessage[],
    ): string {
      const parts: string[] = [systemPrompt, ""];

      // Add conversation context (capped at ~20 exchanges)
      const recentContext = context.slice(-40); // 40 messages = ~20 exchanges
      if (recentContext.length > 0) {
        parts.push("## Conversation history");
        for (const msg of recentContext) {
          parts.push(`${msg.role === "user" ? "User" : "Optio"}: ${msg.content}`);
        }
        parts.push("");
      }

      parts.push(`## Current request\nUser: ${userMessage}`);
      return parts.join("\n");
    }

    /**
     * Run a prompt in the Optio pod and stream the response.
     */
    async function runPrompt(prompt: string) {
      if (isProcessing) {
        send({ type: "error", message: "Already processing a request" });
        return;
      }

      // Check pod readiness
      const podReady = await isOptioPodReady();
      if (!podReady) {
        send({ type: "status", status: "thinking" });
      }

      isProcessing = true;
      send({ type: "status", status: "thinking" });

      const escapedPrompt = prompt.replace(/'/g, "'\\''");

      const script = [
        "set -e",
        // Set auth env vars
        ...Object.entries(authEnv).map(([k, v]) => `export ${k}='${v.replace(/'/g, "'\\''")}'`),
        // Run claude in one-shot mode
        `claude -p '${escapedPrompt}' --output-format stream-json --verbose --dangerously-skip-permissions 2>&1 || true`,
      ].join("\n");

      let fullResponse = "";

      try {
        execSession = await execInOptioPod(["bash", "-c", script]);

        execSession.stdout.on("data", (chunk: Buffer) => {
          outputBuffer += chunk.toString("utf-8");
          const lines = outputBuffer.split("\n");
          outputBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            // Check for action proposals in the text
            const actionMatch = line.match(/ACTION_PROPOSAL:\s*(\{.*\})/);
            if (actionMatch) {
              try {
                const proposal = JSON.parse(actionMatch[1]);
                if (proposal.actions && Array.isArray(proposal.actions)) {
                  pendingActions = proposal.actions;
                  send({ type: "action_proposal", actions: pendingActions! });
                  send({ type: "status", status: "waiting_for_approval" });
                  return;
                }
              } catch {
                // Not valid JSON, treat as normal text
              }
            }

            const { entries } = parseClaudeEvent(line, "optio-chat");
            for (const entry of entries) {
              if (entry.type === "text") {
                fullResponse += entry.content;

                // Check for embedded action proposals in text content
                const embeddedMatch = entry.content.match(/ACTION_PROPOSAL:\s*(\{.*\})/);
                if (embeddedMatch) {
                  try {
                    const proposal = JSON.parse(embeddedMatch[1]);
                    if (proposal.actions && Array.isArray(proposal.actions)) {
                      pendingActions = proposal.actions;
                      // Send text before the proposal
                      const textBefore = entry.content.slice(0, embeddedMatch.index).trim();
                      if (textBefore) {
                        send({ type: "text", content: textBefore });
                      }
                      send({ type: "action_proposal", actions: pendingActions! });
                      send({ type: "status", status: "waiting_for_approval" });
                      return;
                    }
                  } catch {
                    // Not valid JSON, send as text
                  }
                }

                send({ type: "text", content: entry.content });
              } else if (entry.type === "tool_use" && entry.metadata?.toolName) {
                // Check if the tool requires confirmation
                const toolName = entry.metadata.toolName as string;
                if (toolRequiresConfirmation(toolName)) {
                  pendingActions = [
                    {
                      description: entry.content,
                      toolName,
                      toolInput: entry.metadata.toolInput as Record<string, unknown>,
                    },
                  ];
                  send({ type: "action_proposal", actions: pendingActions });
                  send({ type: "status", status: "waiting_for_approval" });
                  return;
                }
                // Read-only tool — let it execute, report status
                send({ type: "status", status: "executing" });
              } else if (entry.type === "error") {
                send({ type: "error", message: entry.content });
              }
              // Skip thinking, system, info, tool_result for the chat UI
            }
          }
        });

        execSession.stderr.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8").trim();
          if (text) {
            log.warn({ stderr: text }, "Optio chat stderr");
          }
        });

        // Wait for the exec to finish
        await new Promise<void>((resolve) => {
          execSession!.stdout.on("end", () => {
            // Flush remaining buffer
            if (outputBuffer.trim()) {
              const { entries } = parseClaudeEvent(outputBuffer, "optio-chat");
              for (const entry of entries) {
                if (entry.type === "text") {
                  fullResponse += entry.content;
                  send({ type: "text", content: entry.content });
                }
              }
              outputBuffer = "";
            }
            resolve();
          });
        });
      } catch (err) {
        log.error({ err }, "Failed to run Optio chat prompt");
        send({ type: "error", message: "Failed to execute agent prompt" });
      } finally {
        isProcessing = false;
        execSession = null;
        if (!pendingActions) {
          send({ type: "status", status: "idle" });
        }
      }
    }

    // Resolve auth env vars once for the connection lifetime
    const authEnv = await buildAuthEnv(log);

    // Handle incoming messages
    socket.on("message", (data: Buffer | string) => {
      const str = typeof data === "string" ? data : data.toString("utf-8");

      let msg: OptioChatClientMessage;
      try {
        msg = JSON.parse(str);
      } catch {
        send({ type: "error", message: "Invalid JSON message" });
        return;
      }

      switch (msg.type) {
        case "message": {
          if (!msg.content?.trim()) {
            send({ type: "error", message: "Empty message" });
            return;
          }

          lastConversationContext = msg.conversationContext ?? [];

          buildSystemPrompt()
            .then((systemPrompt) => {
              const fullPrompt = buildPrompt(systemPrompt, msg.content, lastConversationContext);
              return runPrompt(fullPrompt);
            })
            .catch((err) => {
              log.error({ err }, "Prompt execution failed");
              send({ type: "error", message: "Prompt failed" });
            });
          break;
        }

        case "approve": {
          if (!pendingActions) {
            send({ type: "error", message: "No pending action to approve" });
            return;
          }

          const actions = pendingActions;
          pendingActions = null;

          // Build an approval prompt with the actions to execute
          const approvalPrompt = `The user approved the following actions. Execute them now:\n${actions
            .map((a) => `- ${a.description}`)
            .join("\n")}`;

          buildSystemPrompt()
            .then((systemPrompt) => {
              const fullPrompt = buildPrompt(systemPrompt, approvalPrompt, lastConversationContext);
              return runPrompt(fullPrompt);
            })
            .catch((err) => {
              log.error({ err }, "Approval execution failed");
              send({ type: "error", message: "Failed to execute approved actions" });
            });
          break;
        }

        case "decline": {
          if (!pendingActions) {
            send({ type: "error", message: "No pending action to decline" });
            return;
          }

          pendingActions = null;
          send({ type: "status", status: "idle" });

          // Ask the agent to follow up
          const declinePrompt =
            "The user declined the proposed actions. Ask them what they'd like to change.";

          buildSystemPrompt()
            .then((systemPrompt) => {
              const fullPrompt = buildPrompt(systemPrompt, declinePrompt, lastConversationContext);
              return runPrompt(fullPrompt);
            })
            .catch((err) => {
              log.error({ err }, "Decline follow-up failed");
              send({ type: "error", message: "Failed to process decline" });
            });
          break;
        }

        case "interrupt": {
          if (execSession) {
            log.info("Interrupting Optio chat process");
            execSession.close();
            execSession = null;
            isProcessing = false;
            outputBuffer = "";
            pendingActions = null;
            send({ type: "status", status: "idle" });
          }
          break;
        }

        default:
          send({ type: "error", message: `Unknown message type: ${(msg as any).type}` });
      }
    });

    socket.on("close", () => {
      log.info({ userId }, "Optio chat disconnected");
      activeConversations.delete(userId);
      if (execSession) {
        execSession.close();
        execSession = null;
      }
    });
  });
}

/** Build auth environment variables for the claude process in the pod. */
async function buildAuthEnv(log: {
  warn: (obj: any, msg: string) => void;
}): Promise<Record<string, string>> {
  const env: Record<string, string> = {};

  try {
    const { retrieveSecret } = await import("../services/secret-service.js");
    const authMode = (await retrieveSecret("CLAUDE_AUTH_MODE").catch(() => null)) as string | null;

    if (authMode === "api-key") {
      const apiKey = await retrieveSecret("ANTHROPIC_API_KEY").catch(() => null);
      if (apiKey) {
        env.ANTHROPIC_API_KEY = apiKey as string;
      }
    } else if (authMode === "max-subscription") {
      const { getClaudeAuthToken } = await import("../services/auth-service.js");
      const result = getClaudeAuthToken();
      if (result.available && result.token) {
        env.CLAUDE_CODE_OAUTH_TOKEN = result.token;
      }
    } else if (authMode === "oauth-token") {
      const token = await retrieveSecret("CLAUDE_CODE_OAUTH_TOKEN").catch(() => null);
      if (token) {
        env.CLAUDE_CODE_OAUTH_TOKEN = token as string;
      }
    }
  } catch (err) {
    log.warn({ err }, "Failed to build auth env for Optio chat");
  }

  return env;
}
