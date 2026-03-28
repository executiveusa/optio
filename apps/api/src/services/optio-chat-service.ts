/**
 * Service for the Optio chat assistant.
 *
 * Provides system status summaries and helper functions used by the
 * Optio chat WebSocket handler to build context-rich prompts.
 */

import { db } from "../db/client.js";
import { tasks, repos, repoPods } from "../db/schema.js";
import { sql, eq, inArray } from "drizzle-orm";
import { logger } from "../logger.js";

const log = logger.child({ service: "optio-chat" });

/** Cached system status to avoid querying the DB on every message */
let cachedStatus: string | null = null;
let cachedStatusAt = 0;
const STATUS_CACHE_TTL_MS = 15_000; // 15s cache

export interface SystemStatus {
  taskCounts: Record<string, number>;
  totalTasks: number;
  repoCount: number;
  activePods: number;
  recentFailures: { id: string; title: string; repoUrl: string; errorMessage: string | null }[];
}

/**
 * Fetch a summary of the current system status.
 * Used as context in the Optio assistant's system prompt.
 */
export async function getSystemStatus(): Promise<SystemStatus> {
  const activeStates = [
    "queued",
    "provisioning",
    "running",
    "pr_opened",
    "needs_attention",
  ] as const;

  // Task counts by state
  const stateCountsRaw = await db
    .select({
      state: tasks.state,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(inArray(tasks.state, activeStates))
    .groupBy(tasks.state);

  const taskCounts: Record<string, number> = {};
  let totalTasks = 0;
  for (const row of stateCountsRaw) {
    taskCounts[row.state] = Number(row.count);
    totalTasks += Number(row.count);
  }

  // Total repos
  const [{ count: repoCount }] = await db.select({ count: sql<number>`count(*)` }).from(repos);

  // Active pods
  const [{ count: activePods }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(repoPods)
    .where(eq(repoPods.state, "ready"));

  // Recent failures (last 5)
  const recentFailures = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      repoUrl: tasks.repoUrl,
      errorMessage: tasks.errorMessage,
    })
    .from(tasks)
    .where(eq(tasks.state, "failed"))
    .orderBy(sql`${tasks.updatedAt} DESC`)
    .limit(5);

  return {
    taskCounts,
    totalTasks,
    repoCount: Number(repoCount),
    activePods: Number(activePods),
    recentFailures,
  };
}

/**
 * Get a human-readable system status summary for the assistant's prompt.
 * Cached for 15 seconds to avoid excessive DB queries.
 */
export async function getSystemStatusSummary(): Promise<string> {
  if (cachedStatus && Date.now() - cachedStatusAt < STATUS_CACHE_TTL_MS) {
    return cachedStatus;
  }

  try {
    const status = await getSystemStatus();
    const lines: string[] = [];

    lines.push(`- **Active tasks**: ${status.totalTasks}`);

    const stateParts: string[] = [];
    for (const [state, count] of Object.entries(status.taskCounts)) {
      if (count > 0) stateParts.push(`${state}: ${count}`);
    }
    if (stateParts.length > 0) {
      lines.push(`  - ${stateParts.join(", ")}`);
    }

    lines.push(`- **Repositories**: ${status.repoCount} configured`);
    lines.push(`- **Active pods**: ${status.activePods}`);

    if (status.recentFailures.length > 0) {
      lines.push(`- **Recent failures** (${status.recentFailures.length}):`);
      for (const f of status.recentFailures) {
        const shortId = f.id.slice(0, 8);
        const error = f.errorMessage ? ` — ${f.errorMessage.slice(0, 80)}` : "";
        lines.push(`  - \`${shortId}\` ${f.title}${error}`);
      }
    } else {
      lines.push("- **Recent failures**: none");
    }

    cachedStatus = lines.join("\n");
    cachedStatusAt = Date.now();
    return cachedStatus;
  } catch (err) {
    log.warn({ err }, "Failed to fetch system status for Optio chat");
    return "System status unavailable (database error).";
  }
}
