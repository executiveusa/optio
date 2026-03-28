/**
 * Manages a dedicated pod for the Optio chat assistant.
 *
 * The Optio pod is a lightweight, long-lived pod with Claude Code installed.
 * It doesn't need a git repo — it's used solely for running `claude -p`
 * invocations that interact with the Optio API to manage tasks/repos/etc.
 */

import { getRuntime } from "./container-service.js";
import type { ContainerHandle, ContainerSpec, ExecSession } from "@optio/shared";
import { DEFAULT_AGENT_IMAGE } from "@optio/shared";
import { logger } from "../logger.js";

const OPTIO_POD_NAME = "optio-assistant";
const NAMESPACE = process.env.OPTIO_NAMESPACE ?? "optio";

const log = logger.child({ service: "optio-pod" });

/** Cached handle for the Optio pod */
let cachedHandle: ContainerHandle | null = null;

/**
 * Get or create the Optio assistant pod.
 * Returns a ContainerHandle for exec operations.
 */
export async function getOrCreateOptioPod(): Promise<ContainerHandle> {
  const rt = getRuntime();

  // Check if we have a cached handle and it's still running
  if (cachedHandle) {
    try {
      const status = await rt.status(cachedHandle);
      if (status.state === "running") {
        return cachedHandle;
      }
    } catch {
      // Pod gone, clear cache
      cachedHandle = null;
    }
  }

  // Try to find existing pod by name
  const handle: ContainerHandle = { id: OPTIO_POD_NAME, name: OPTIO_POD_NAME };
  try {
    const status = await rt.status(handle);
    if (status.state === "running") {
      cachedHandle = handle;
      return handle;
    }
    if (status.state === "pending") {
      // Wait for it to become ready
      await waitForPodReady(handle);
      cachedHandle = handle;
      return handle;
    }
    // Pod exists but in bad state — destroy and recreate
    await rt.destroy(handle).catch(() => {});
  } catch {
    // Pod doesn't exist, create it
  }

  // Create a new Optio pod
  log.info("Creating Optio assistant pod");
  const image = process.env.OPTIO_AGENT_IMAGE ?? DEFAULT_AGENT_IMAGE;

  const spec: ContainerSpec = {
    name: OPTIO_POD_NAME,
    image,
    command: ["sleep", "infinity"],
    env: {},
    workDir: "/workspace",
    imagePullPolicy:
      (process.env.OPTIO_IMAGE_PULL_POLICY as "Always" | "Never" | "IfNotPresent") ?? "Never",
    labels: {
      "optio.type": "assistant-pod",
      "managed-by": "optio",
    },
  };

  const created = await rt.create(spec);
  await waitForPodReady(created);
  cachedHandle = created;
  log.info({ podName: created.name }, "Optio assistant pod ready");
  return created;
}

/**
 * Check if the Optio pod is ready for exec.
 */
export async function isOptioPodReady(): Promise<boolean> {
  const rt = getRuntime();
  const handle: ContainerHandle = { id: OPTIO_POD_NAME, name: OPTIO_POD_NAME };
  try {
    const status = await rt.status(handle);
    return status.state === "running";
  } catch {
    return false;
  }
}

/**
 * Execute a command in the Optio pod.
 */
export async function execInOptioPod(command: string[]): Promise<ExecSession> {
  const handle = await getOrCreateOptioPod();
  const rt = getRuntime();
  return rt.exec(handle, command, { tty: false });
}

/** Wait for a pod to reach running state (up to 120s). */
async function waitForPodReady(handle: ContainerHandle, timeoutMs = 120_000): Promise<void> {
  const rt = getRuntime();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const status = await rt.status(handle);
      if (status.state === "running") return;
      if (status.state === "failed") throw new Error("Optio pod failed to start");
    } catch (err: any) {
      if (err.message?.includes("failed to start")) throw err;
      // Pod not yet visible, keep waiting
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }

  throw new Error("Optio pod did not become ready within timeout");
}

/** Clear the cached handle (e.g. on pod health check failure). */
export function invalidateOptioPodCache(): void {
  cachedHandle = null;
}
