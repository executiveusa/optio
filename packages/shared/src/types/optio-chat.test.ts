import { describe, it, expect } from "vitest";
import { toolRequiresConfirmation, OPTIO_TOOLS } from "./optio-chat.js";

describe("optio-chat types", () => {
  describe("OPTIO_TOOLS", () => {
    it("has at least one read-only tool", () => {
      const readOnly = OPTIO_TOOLS.filter((t) => !t.requiresConfirmation);
      expect(readOnly.length).toBeGreaterThan(0);
    });

    it("has at least one write tool", () => {
      const write = OPTIO_TOOLS.filter((t) => t.requiresConfirmation);
      expect(write.length).toBeGreaterThan(0);
    });

    it("every tool has a name and description", () => {
      for (const tool of OPTIO_TOOLS) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
      }
    });

    it("has no duplicate tool names", () => {
      const names = OPTIO_TOOLS.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("toolRequiresConfirmation", () => {
    it("returns false for read-only tools", () => {
      expect(toolRequiresConfirmation("list_tasks")).toBe(false);
      expect(toolRequiresConfirmation("get_task")).toBe(false);
      expect(toolRequiresConfirmation("get_task_logs")).toBe(false);
      expect(toolRequiresConfirmation("list_repos")).toBe(false);
      expect(toolRequiresConfirmation("get_costs")).toBe(false);
    });

    it("returns true for write tools", () => {
      expect(toolRequiresConfirmation("create_task")).toBe(true);
      expect(toolRequiresConfirmation("retry_task")).toBe(true);
      expect(toolRequiresConfirmation("cancel_task")).toBe(true);
      expect(toolRequiresConfirmation("bulk_retry_failed")).toBe(true);
      expect(toolRequiresConfirmation("assign_issue")).toBe(true);
    });

    it("returns true for unknown tools (safe default)", () => {
      expect(toolRequiresConfirmation("unknown_tool")).toBe(true);
      expect(toolRequiresConfirmation("delete_everything")).toBe(true);
    });
  });
});
