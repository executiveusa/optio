"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Send,
  Square,
  Bot,
  User,
  Terminal,
  FileText,
  Pencil,
  Search,
  Wrench,
  Info,
  AlertCircle,
  Brain,
  Loader2,
  ChevronRight,
  ChevronDown,
  DollarSign,
} from "lucide-react";
import type { ChatAgentStatus, ChatServerMessage, ChatEventMessage } from "@optio/shared";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:4000";

const TOOL_ICONS: Record<string, React.ElementType> = {
  Bash: Terminal,
  Read: FileText,
  Edit: Pencil,
  Write: FileText,
  Grep: Search,
  Glob: Search,
};

interface ChatMessage {
  role: "user" | "assistant";
  eventType: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

interface SessionChatProps {
  sessionId: string;
  onCostUpdate?: (costUsd: string) => void;
  sendToAgent?: string | null;
  onSendToAgentHandled?: () => void;
}

export function SessionChat({
  sessionId,
  onCostUpdate,
  sendToAgent,
  onSendToAgentHandled,
}: SessionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<ChatAgentStatus>("idle");
  const [connected, setConnected] = useState(false);
  const [messageCost, setMessageCost] = useState<string | null>(null);
  const [collapsedTools, setCollapsedTools] = useState<Set<number>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle "send to agent" from terminal
  useEffect(() => {
    if (sendToAgent && connected && status === "idle") {
      setInput(sendToAgent);
      onSendToAgentHandled?.();
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [sendToAgent, connected, status, onSendToAgentHandled]);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws/sessions/${sessionId}/chat`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      let msg: ChatServerMessage;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "chat:event":
          setMessages((prev) => [
            ...prev,
            {
              role: msg.role,
              eventType: msg.eventType,
              content: msg.content,
              metadata: msg.metadata,
              timestamp: msg.timestamp,
            },
          ]);
          break;

        case "chat:status":
          setStatus(msg.status);
          break;

        case "chat:cost":
          onCostUpdate?.(msg.totalCostUsd);
          if (msg.messageCostUsd) {
            setMessageCost(msg.messageCostUsd);
          }
          break;

        case "chat:error":
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              eventType: "error",
              content: msg.message,
              timestamp: new Date().toISOString(),
            },
          ]);
          break;

        case "chat:history":
          setMessages(
            msg.messages.map((m) => ({
              role: m.role,
              eventType: m.eventType,
              content: m.content,
              metadata: m.metadata,
              timestamp: m.timestamp,
            })),
          );
          break;
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [sessionId, onCostUpdate]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !wsRef.current || status !== "idle") return;
    wsRef.current.send(JSON.stringify({ type: "message", content: input.trim() }));
    setInput("");
    setMessageCost(null);
  }, [input, status]);

  const handleInterrupt = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "interrupt" }));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const toggleToolCollapse = useCallback((index: number) => {
    setCollapsedTools((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // Group consecutive assistant messages for rendering
  const groups = groupMessages(messages);

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-card">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">Agent Chat</span>
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              connected ? "bg-success animate-pulse" : "bg-text-muted/30",
            )}
          />
          {status !== "idle" && (
            <span className="text-primary text-[11px] flex items-center gap-1">
              {status === "thinking" ? (
                <>
                  <Brain className="w-3 h-3 animate-pulse" />
                  Thinking...
                </>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Responding...
                </>
              )}
            </span>
          )}
        </div>
        {messageCost && (
          <span className="text-[10px] text-text-muted flex items-center gap-0.5 tabular-nums">
            <DollarSign className="w-2.5 h-2.5" />
            {parseFloat(messageCost).toFixed(4)} last message
          </span>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-1">
        {groups.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-text-muted/40">
              <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Agent Chat</p>
              <p className="text-xs mt-1">Send a message to start working with the AI agent.</p>
              <p className="text-xs mt-0.5">
                The agent can read, edit, and run commands in this workspace.
              </p>
            </div>
          </div>
        )}
        {groups.map((group, gi) => (
          <MessageGroup
            key={gi}
            group={group}
            groupIndex={gi}
            collapsedTools={collapsedTools}
            onToggleToolCollapse={toggleToolCollapse}
          />
        ))}
        {/* Typing indicator */}
        {status !== "idle" && (
          <div className="flex items-start gap-2 py-1">
            <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
              <Bot className="w-3 h-3 text-primary" />
            </div>
            <div className="flex items-center gap-1 text-xs text-text-muted py-1">
              <span className="inline-flex gap-0.5">
                <span
                  className="w-1 h-1 rounded-full bg-text-muted animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-text-muted animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-text-muted animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !connected
                ? "Connecting..."
                : status !== "idle"
                  ? "Agent is working..."
                  : "Send a message to the agent..."
            }
            disabled={!connected}
            rows={1}
            className={cn(
              "flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm resize-none",
              "placeholder:text-text-muted/40 outline-none focus:border-primary/50 transition-colors",
              "min-h-[38px] max-h-[120px]",
              !connected && "opacity-50",
            )}
            style={{ fieldSizing: "content" as any }}
          />
          {status !== "idle" ? (
            <button
              onClick={handleInterrupt}
              className="shrink-0 p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
              title="Interrupt agent"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !connected}
              className={cn(
                "shrink-0 p-2 rounded-lg transition-colors",
                input.trim() && connected
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-bg border border-border text-text-muted/30",
              )}
              title="Send message (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Message grouping ────────────────────────────────────────────────────────

type MessageGroupData =
  | { type: "user"; message: ChatMessage }
  | {
      type: "assistant";
      events: Array<{ message: ChatMessage; originalIndex: number }>;
    };

function groupMessages(messages: ChatMessage[]): MessageGroupData[] {
  const groups: MessageGroupData[] = [];
  let currentAssistantEvents: Array<{ message: ChatMessage; originalIndex: number }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === "user") {
      if (currentAssistantEvents.length > 0) {
        groups.push({ type: "assistant", events: currentAssistantEvents });
        currentAssistantEvents = [];
      }
      groups.push({ type: "user", message: msg });
    } else {
      currentAssistantEvents.push({ message: msg, originalIndex: i });
    }
  }

  if (currentAssistantEvents.length > 0) {
    groups.push({ type: "assistant", events: currentAssistantEvents });
  }

  return groups;
}

// ── Message rendering ───────────────────────────────────────────────────────

function MessageGroup({
  group,
  groupIndex,
  collapsedTools,
  onToggleToolCollapse,
}: {
  group: MessageGroupData;
  groupIndex: number;
  collapsedTools: Set<number>;
  onToggleToolCollapse: (index: number) => void;
}) {
  if (group.type === "user") {
    return (
      <div className="flex items-start gap-2 py-2">
        <div className="shrink-0 w-5 h-5 rounded-full bg-bg-card border border-border flex items-center justify-center mt-0.5">
          <User className="w-3 h-3 text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm whitespace-pre-wrap break-words">{group.message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 py-2">
      <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Bot className="w-3 h-3 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        {group.events.map(({ message, originalIndex }) => (
          <ChatEventLine
            key={originalIndex}
            message={message}
            index={originalIndex}
            isCollapsed={collapsedTools.has(originalIndex)}
            onToggleCollapse={() => onToggleToolCollapse(originalIndex)}
          />
        ))}
      </div>
    </div>
  );
}

function ChatEventLine({
  message,
  index,
  isCollapsed,
  onToggleCollapse,
}: {
  message: ChatMessage;
  index: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { eventType, content, metadata } = message;

  if (eventType === "text") {
    return (
      <div className="text-sm whitespace-pre-wrap break-words text-text/90 leading-relaxed">
        {content}
      </div>
    );
  }

  if (eventType === "thinking") {
    return (
      <div className="text-xs text-text-muted/50 italic pl-3 border-l-2 border-text-muted/15 py-1 my-1">
        {content.length > 200 ? content.slice(0, 200) + "..." : content}
      </div>
    );
  }

  if (eventType === "tool_use") {
    const toolName = (metadata?.toolName as string) ?? "Tool";
    const Icon = TOOL_ICONS[toolName] ?? Wrench;

    return (
      <div className="rounded-md border border-border/50 my-1 overflow-hidden text-xs">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left bg-bg-card hover:bg-bg-card-hover transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-2.5 h-2.5 text-text-muted/40 shrink-0" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5 text-text-muted/40 shrink-0" />
          )}
          <Icon className="w-3 h-3 text-primary shrink-0" />
          <span className="font-medium text-primary font-sans">{toolName}</span>
          <span className="text-text-muted/60 truncate flex-1">{content}</span>
        </button>
      </div>
    );
  }

  if (eventType === "tool_result") {
    if (isCollapsed) return null;
    return (
      <div className="text-[11px] text-text-muted/50 pl-4 py-1 max-h-40 overflow-auto">
        <pre className="whitespace-pre-wrap break-all">{content}</pre>
      </div>
    );
  }

  if (eventType === "system") {
    return (
      <div className="flex items-center gap-1.5 py-1 text-info/50 text-[11px]">
        <Info className="w-3 h-3 shrink-0" />
        <span>{content}</span>
      </div>
    );
  }

  if (eventType === "error") {
    return (
      <div className="flex items-start gap-1.5 py-1.5 px-2 rounded-md bg-error/5 text-error text-xs my-1">
        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="whitespace-pre-wrap">{content}</span>
      </div>
    );
  }

  if (eventType === "info") {
    const cost = metadata?.cost as number | undefined;
    return (
      <div className="flex items-start gap-1.5 py-1 text-success/80 text-xs">
        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
        <span className="whitespace-pre-wrap">{content}</span>
        {cost != null && cost > 0 && (
          <span className="ml-1 text-text-muted/40 inline-flex items-center gap-0.5 tabular-nums">
            <DollarSign className="w-2.5 h-2.5" />
            {cost.toFixed(4)}
          </span>
        )}
      </div>
    );
  }

  // Fallback
  return <div className="text-xs text-text-muted py-0.5">{content}</div>;
}
