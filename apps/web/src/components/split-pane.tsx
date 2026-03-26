"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelRightClose } from "lucide-react";

const STORAGE_KEY = "optio-session-split-ratio";
const MIN_PANE_PCT = 15;
const DEFAULT_RATIO = 50;

interface SplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
}

export function SplitPane({ left, right, leftLabel, rightLabel }: SplitPaneProps) {
  const [ratio, setRatio] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_RATIO;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_RATIO;
  });
  const [collapsed, setCollapsed] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // Persist ratio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(ratio));
  }, [ratio]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(MIN_PANE_PCT, Math.min(100 - MIN_PANE_PCT, pct));
      setRatio(clamped);
      setCollapsed(null);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const leftWidth = collapsed === "left" ? 0 : collapsed === "right" ? 100 : ratio;
  const rightWidth = 100 - leftWidth;

  return (
    <div ref={containerRef} className="flex h-full min-h-0 relative">
      {/* Left pane */}
      {leftWidth > 0 && (
        <div className="min-h-0 overflow-hidden" style={{ width: `${leftWidth}%` }}>
          {left}
        </div>
      )}

      {/* Divider */}
      <div
        className={cn(
          "shrink-0 flex flex-col items-center justify-center gap-1",
          "w-[5px] bg-border/50 hover:bg-primary/30 transition-colors cursor-col-resize",
          "group relative",
        )}
        onMouseDown={onMouseDown}
      >
        {/* Collapse buttons */}
        <div className="absolute top-2 flex flex-col gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(collapsed === "left" ? null : "left");
            }}
            className="p-0.5 rounded bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            title={
              collapsed === "left" ? `Show ${leftLabel ?? "left"}` : `Hide ${leftLabel ?? "left"}`
            }
          >
            <PanelLeftClose className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(collapsed === "right" ? null : "right");
            }}
            className="p-0.5 rounded bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            title={
              collapsed === "right"
                ? `Show ${rightLabel ?? "right"}`
                : `Hide ${rightLabel ?? "right"}`
            }
          >
            <PanelRightClose className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right pane */}
      {rightWidth > 0 && (
        <div className="min-h-0 overflow-hidden" style={{ width: `${rightWidth}%` }}>
          {right}
        </div>
      )}
    </div>
  );
}
