import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRuntime = {
  create: vi.fn(),
  status: vi.fn(),
  exec: vi.fn(),
  destroy: vi.fn(),
  logs: vi.fn(),
  ping: vi.fn(),
};

vi.mock("./container-service.js", () => ({
  getRuntime: () => mockRuntime,
}));

vi.mock("@optio/shared", async () => {
  const actual = await vi.importActual("@optio/shared");
  return {
    ...actual,
    DEFAULT_AGENT_IMAGE: "optio-agent:latest",
  };
});

vi.mock("../logger.js", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { isOptioPodReady, invalidateOptioPodCache } from "./optio-pod-service.js";

describe("optio-pod-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateOptioPodCache();
  });

  describe("isOptioPodReady", () => {
    it("returns true when pod is running", async () => {
      mockRuntime.status.mockResolvedValue({ state: "running" });

      const ready = await isOptioPodReady();
      expect(ready).toBe(true);
    });

    it("returns false when pod does not exist", async () => {
      mockRuntime.status.mockRejectedValue(new Error("Not found"));

      const ready = await isOptioPodReady();
      expect(ready).toBe(false);
    });

    it("returns false when pod is not running", async () => {
      mockRuntime.status.mockResolvedValue({ state: "pending" });

      const ready = await isOptioPodReady();
      expect(ready).toBe(false);
    });
  });
});
