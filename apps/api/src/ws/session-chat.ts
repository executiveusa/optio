import type { FastifyInstance } from "fastify";
import { getRuntime } from "../services/container-service.js";
import {
  getSession,
  updateSessionCost,
  addSessionPr,
} from "../services/interactive-session-service.js";
import { db } from "../db/client.js";
import { repoPods, repos } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../logger.js";
import { parseClaudeEvent } from "../services/agent-event-parser.js";
import type { ContainerHandle, ExecSession } from "@optio/shared";
import type { ChatClientMessage, ChatServerMessage, ChatEventMessage } from "@optio/shared";

const PR_URL_REGEX = /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/g;

export async function sessionChatWs(app: FastifyInstance) {
  app.get("/ws/sessions/:sessionId/chat", { websocket: true }, async (socket, req) => {
    const { sessionId } = req.params as { sessionId: string };
    const log = logger.child({ sessionId, handler: "session-chat" });

    const session = await getSession(sessionId);
    if (!session) {
      socket.send(JSON.stringify({ type: "chat:error", message: "Session not found" }));
      socket.close();
      return;
    }

    if (session.state !== "active") {
      socket.send(JSON.stringify({ type: "chat:error", message: "Session is not active" }));
      socket.close();
      return;
    }

    if (!session.podId) {
      socket.send(JSON.stringify({ type: "chat:error", message: "Session has no pod assigned" }));
      socket.close();
      return;
    }

    // Get pod info
    const [pod] = await db.select().from(repoPods).where(eq(repoPods.id, session.podId));
    if (!pod || !pod.podName) {
      socket.send(JSON.stringify({ type: "chat:error", message: "Pod not found or not ready" }));
      socket.close();
      return;
    }

    // Get repo config for model settings
    const [repoConfig] = await db.select().from(repos).where(eq(repos.repoUrl, session.repoUrl));

    const rt = getRuntime();
    const handle: ContainerHandle = { id: pod.podId ?? pod.podName, name: pod.podName };
    const worktreePath = session.worktreePath ?? "/workspace/repo";

    // State for the long-running claude process
    let claudeExec: ExecSession | null = null;
    let lineBuffer = "";
    let totalCostUsd = parseFloat(session.costUsd ?? "0");
    let currentMessageCost = 0;
    const chatHistory: ChatEventMessage[] = [];
    const detectedPrs = new Set<number>();

    const send = (msg: ChatServerMessage) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(msg));
      }
    };

    // Send initial status
    send({ type: "chat:status", status: "idle" });
    send({ type: "chat:cost", totalCostUsd: totalCostUsd.toFixed(4) });

    // Build auth env for the claude process
    const buildAuthEnv = async (): Promise<string[]> => {
      const envLines: string[] = [];
      try {
        const { retrieveSecret } = await import("../services/secret-service.js");
        const authMode =
          ((await retrieveSecret("CLAUDE_AUTH_MODE").catch(() => null)) as any) ?? "api-key";

        if (authMode === "max-subscription") {
          const { getClaudeAuthToken } = await import("../services/auth-service.js");
          const authResult = getClaudeAuthToken();
          if (authResult.available && authResult.token) {
            envLines.push(`export CLAUDE_CODE_OAUTH_TOKEN="${authResult.token}"`);
          }
        } else {
          const apiKey = await retrieveSecret("ANTHROPIC_API_KEY").catch(() => null);
          if (apiKey) {
            envLines.push(`export ANTHROPIC_API_KEY="${apiKey}"`);
          }
        }
      } catch (err) {
        log.warn({ err }, "Failed to build auth env for chat");
      }
      return envLines;
    };

    const launchClaude = async (userMessage: string) => {
      if (claudeExec) {
        // Write the message to stdin of the existing process if it's in conversation mode
        // But we use one-shot -p for each message, so we need to start a new process
        claudeExec.close();
        claudeExec = null;
      }

      send({ type: "chat:status", status: "thinking" });
      currentMessageCost = 0;

      // Record user message in history
      const userEvent: ChatEventMessage = {
        type: "chat:event",
        role: "user",
        eventType: "text",
        content: userMessage,
        timestamp: new Date().toISOString(),
      };
      chatHistory.push(userEvent);
      send(userEvent);

      // Build model flags
      const model = repoConfig?.claudeModel ?? "sonnet";
      const modelFlag = model ? `--model ${model}` : "";

      const authEnv = await buildAuthEnv();

      const script = [
        "set -e",
        // Wait for repo to be ready
        "for i in $(seq 1 30); do [ -f /workspace/.ready ] && break; sleep 1; done",
        '[ -f /workspace/.ready ] || { echo "Repo not ready"; exit 1; }',
        `cd "${worktreePath}"`,
        ...authEnv,
        // Run claude in one-shot mode with streaming JSON output
        `claude -p ${shellEscape(userMessage)} --dangerously-skip-permissions --output-format stream-json --verbose ${modelFlag} --max-turns 50`,
      ].join("\n");

      try {
        claudeExec = await rt.exec(handle, ["bash", "-c", script], { tty: false });

        claudeExec.stdout.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8");
          lineBuffer += text;

          // Process complete NDJSON lines
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            processAgentLine(line);
          }
        });

        claudeExec.stderr.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf-8").trim();
          if (text) {
            log.debug({ stderr: text }, "Claude stderr");
          }
        });

        claudeExec.stdout.on("end", () => {
          // Process any remaining buffer
          if (lineBuffer.trim()) {
            processAgentLine(lineBuffer);
            lineBuffer = "";
          }
          claudeExec = null;
          send({ type: "chat:status", status: "idle" });
        });

        claudeExec.stdout.on("error", (err: Error) => {
          log.error({ err }, "Claude stdout error");
          claudeExec = null;
          send({ type: "chat:error", message: "Agent process error" });
          send({ type: "chat:status", status: "idle" });
        });
      } catch (err) {
        log.error({ err }, "Failed to launch claude process");
        send({ type: "chat:error", message: "Failed to start agent" });
        send({ type: "chat:status", status: "idle" });
      }
    };

    const processAgentLine = (line: string) => {
      const { entries } = parseClaudeEvent(line, sessionId);

      for (const entry of entries) {
        // Check for cost info in result events
        if (entry.type === "info" && entry.metadata?.cost) {
          currentMessageCost = entry.metadata.cost as number;
          totalCostUsd += currentMessageCost;

          // Persist cost
          updateSessionCost(sessionId, totalCostUsd.toFixed(4)).catch((err) => {
            log.warn({ err }, "Failed to update session cost");
          });

          send({
            type: "chat:cost",
            totalCostUsd: totalCostUsd.toFixed(4),
            messageCostUsd: currentMessageCost.toFixed(4),
          });
        }

        // Detect PR URLs in text content
        if (entry.content) {
          for (const match of entry.content.matchAll(PR_URL_REGEX)) {
            const prNumber = parseInt(match[1], 10);
            if (!detectedPrs.has(prNumber)) {
              detectedPrs.add(prNumber);
              addSessionPr(sessionId, match[0], prNumber).catch((err) => {
                log.warn({ err, prUrl: match[0] }, "Failed to register session PR from chat");
              });
            }
          }
        }

        // Send to client
        const chatEvent: ChatEventMessage = {
          type: "chat:event",
          role: "assistant",
          eventType: entry.type,
          content: entry.content,
          metadata: entry.metadata,
          timestamp: entry.timestamp,
        };
        chatHistory.push(chatEvent);
        send(chatEvent);

        // Update status based on event type
        if (entry.type === "thinking") {
          send({ type: "chat:status", status: "thinking" });
        } else if (entry.type === "text" || entry.type === "tool_use") {
          send({ type: "chat:status", status: "responding" });
        }
      }
    };

    // Handle incoming messages from client
    socket.on("message", (data: Buffer | string) => {
      const str = typeof data === "string" ? data : data.toString("utf-8");

      let msg: ChatClientMessage;
      try {
        msg = JSON.parse(str);
      } catch {
        send({ type: "chat:error", message: "Invalid message format" });
        return;
      }

      if (msg.type === "message" && msg.content) {
        launchClaude(msg.content).catch((err) => {
          log.error({ err }, "Failed to handle chat message");
          send({ type: "chat:error", message: "Failed to process message" });
        });
      } else if (msg.type === "interrupt") {
        if (claudeExec) {
          log.info("Interrupting claude process");
          claudeExec.close();
          claudeExec = null;
          send({ type: "chat:status", status: "idle" });
        }
      }
    });

    // Handle WebSocket close
    socket.on("close", () => {
      log.info("Session chat disconnected");
      if (claudeExec) {
        claudeExec.close();
        claudeExec = null;
      }
    });
  });
}

/** Escape a string for safe use in a single-quoted shell argument */
function shellEscape(str: string): string {
  // Use $'...' syntax which handles special chars
  return "'" + str.replace(/'/g, "'\\''") + "'";
}
