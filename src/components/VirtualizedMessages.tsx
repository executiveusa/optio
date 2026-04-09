/**
 * VirtualizedMessages — Windowed chat message list using pretext for height pre-calculation
 * ───────────────────────────────────────────────────────────────────────────────────────────
 * Uses @chenglou/pretext's prepare() + layout() to measure message heights without DOM,
 * then only renders the visible window + buffer.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { prepare, layout } from '@chenglou/pretext';
import type { AgentMessage } from '../agent/agent-config';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const BUFFER_SIZE = 5;          // Extra messages to render above/below viewport
const FONT = "14px 'DM Sans', system-ui, sans-serif";
const LINE_HEIGHT = 21;         // 14px * 1.5
const MSG_PADDING_V = 20;       // top + bottom padding
const MSG_PADDING_H = 28;       // left + right padding
const MSG_GAP = 12;             // gap between messages
const MAX_WIDTH_RATIO = 0.80;   // 80% of container

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface VirtualizedMessagesProps {
  messages: AgentMessage[];
  streamingText?: string;
  isLoading?: boolean;
  containerWidth?: number;
  typingLabel?: string;
}

interface MeasuredItem {
  index: number;
  height: number;
  offsetTop: number;
}

// ─── HEIGHT CACHE ────────────────────────────────────────────────────────────

const heightCache = new Map<string, number>();

function measureMessageHeight(text: string, maxTextWidth: number): number {
  const cacheKey = `${text.length}:${maxTextWidth}:${text.slice(0, 64)}`;
  const cached = heightCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const prepared = prepare(text, FONT);
    const result = layout(prepared, maxTextWidth, LINE_HEIGHT);
    const height = result.height + MSG_PADDING_V;
    heightCache.set(cacheKey, height);
    return height;
  } catch {
    // Fallback: estimate by line count
    const charsPerLine = Math.max(1, Math.floor(maxTextWidth / 8));
    const lineCount = Math.ceil(text.length / charsPerLine);
    const height = lineCount * LINE_HEIGHT + MSG_PADDING_V;
    heightCache.set(cacheKey, height);
    return height;
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function VirtualizedMessages({
  messages,
  streamingText = '',
  isLoading = false,
  containerWidth = 390,
  typingLabel = '...',
}: VirtualizedMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [autoScroll, setAutoScroll] = useState(true);

  const maxBubbleWidth = containerWidth * MAX_WIDTH_RATIO;
  const maxTextWidth = maxBubbleWidth - MSG_PADDING_H;

  // ─── MEASURE ALL ITEMS ──────────────────────────────────────────

  const measured = useMemo<MeasuredItem[]>(() => {
    let offsetTop = 0;
    return messages.map((msg, index) => {
      const height = measureMessageHeight(msg.content || '', maxTextWidth);
      const item: MeasuredItem = { index, height, offsetTop };
      offsetTop += height + MSG_GAP;
      return item;
    });
  }, [messages, maxTextWidth]);

  const totalHeight = useMemo(() => {
    if (measured.length === 0) return 0;
    const last = measured[measured.length - 1];
    return last.offsetTop + last.height;
  }, [measured]);

  // ─── VISIBLE RANGE ─────────────────────────────────────────────

  const visibleRange = useMemo(() => {
    if (measured.length === 0) return { start: 0, end: 0 };

    // Binary search for first visible
    let lo = 0, hi = measured.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (measured[mid].offsetTop + measured[mid].height < scrollTop) lo = mid + 1;
      else hi = mid;
    }
    const start = Math.max(0, lo - BUFFER_SIZE);

    // Find last visible
    const bottomEdge = scrollTop + viewportHeight;
    let end = lo;
    while (end < measured.length && measured[end].offsetTop < bottomEdge) end++;
    end = Math.min(measured.length, end + BUFFER_SIZE);

    return { start, end };
  }, [measured, scrollTop, viewportHeight]);

  // ─── SCROLL HANDLER ─────────────────────────────────────────────

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    // Detect if user scrolled up (disable auto-scroll)
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  }, []);

  // ─── AUTO-SCROLL ON NEW MESSAGES ─────────────────────────────────

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, streamingText, autoScroll]);

  // ─── RESIZE OBSERVER ────────────────────────────────────────────

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    setViewportHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // ─── RENDER ─────────────────────────────────────────────────────

  const visibleItems = measured.slice(visibleRange.start, visibleRange.end);
  const topPad = visibleItems.length > 0 ? visibleItems[0].offsetTop : 0;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight + (isLoading || streamingText ? 80 : 0), position: 'relative' }}>
        {/* Offset positioned items */}
        <div style={{ transform: `translateY(${topPad}px)`, padding: '16px' }}>
          {visibleItems.map((item) => {
            const msg = messages[item.index];
            const isUser = msg.role === 'user';
            return (
              <div
                key={item.index}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginBottom: MSG_GAP,
                }}
              >
                <div
                  style={{
                    maxWidth: `${MAX_WIDTH_RATIO * 100}%`,
                    padding: '10px 14px',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isUser
                      ? 'linear-gradient(135deg, #2b8fd9, #1a5fa0)'
                      : 'rgba(255,255,255,0.05)',
                    color: '#edf0f5',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {/* Streaming / typing indicator (always at bottom, not virtualized) */}
          {(isLoading || streamingText) && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: MSG_GAP }}>
              <div
                style={{
                  maxWidth: `${MAX_WIDTH_RATIO * 100}%`,
                  padding: '10px 14px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#edf0f5',
                  fontSize: '14px',
                }}
              >
                {streamingText || (
                  <span style={{ color: 'rgba(237,240,245,0.35)' }}>{typingLabel}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
