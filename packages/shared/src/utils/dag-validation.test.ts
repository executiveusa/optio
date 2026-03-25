import { describe, it, expect } from "vitest";
import { validateDAG, wouldCreateCycle } from "./dag-validation.js";

describe("dag-validation", () => {
  describe("validateDAG", () => {
    it("returns valid for empty graph", () => {
      expect(validateDAG([])).toEqual({ valid: true });
    });

    it("returns valid for a simple chain (A -> B -> C)", () => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["B", "C"],
      ];
      expect(validateDAG(edges)).toEqual({ valid: true });
    });

    it("returns valid for a diamond DAG", () => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["A", "C"],
        ["B", "D"],
        ["C", "D"],
      ];
      expect(validateDAG(edges)).toEqual({ valid: true });
    });

    it("returns valid for disconnected components", () => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["C", "D"],
      ];
      expect(validateDAG(edges)).toEqual({ valid: true });
    });

    it("detects a simple cycle (A -> B -> A)", () => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["B", "A"],
      ];
      const result = validateDAG(edges);
      expect(result.valid).toBe(false);
      expect(result.cycle).toBeDefined();
      expect(result.cycle!.length).toBeGreaterThanOrEqual(2);
    });

    it("detects a 3-node cycle (A -> B -> C -> A)", () => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["B", "C"],
        ["C", "A"],
      ];
      const result = validateDAG(edges);
      expect(result.valid).toBe(false);
      expect(result.cycle).toBeDefined();
    });

    it("detects a self-loop", () => {
      const edges: [string, string][] = [["A", "A"]];
      const result = validateDAG(edges);
      expect(result.valid).toBe(false);
    });

    it("detects cycle in larger graph", () => {
      const edges: [string, string][] = [
        ["A", "B"],
        ["B", "C"],
        ["C", "D"],
        ["D", "B"],
        ["E", "F"],
      ];
      const result = validateDAG(edges);
      expect(result.valid).toBe(false);
    });

    it("handles many nodes without cycle", () => {
      const edges: [string, string][] = [];
      for (let i = 0; i < 100; i++) edges.push([String(i), String(i + 1)]);
      expect(validateDAG(edges)).toEqual({ valid: true });
    });
  });

  describe("wouldCreateCycle", () => {
    it("returns false when adding edge to empty graph", () => {
      expect(wouldCreateCycle([], "A", "B")).toBe(false);
    });

    it("returns false when extending a chain", () => {
      expect(wouldCreateCycle([["A", "B"]], "B", "C")).toBe(false);
    });

    it("returns true when adding a back edge", () => {
      expect(
        wouldCreateCycle(
          [
            ["A", "B"],
            ["B", "C"],
          ],
          "C",
          "A",
        ),
      ).toBe(true);
    });

    it("returns true for self-reference", () => {
      expect(wouldCreateCycle([], "A", "A")).toBe(true);
    });

    it("returns false for adding parallel edge", () => {
      expect(
        wouldCreateCycle(
          [
            ["A", "B"],
            ["A", "C"],
          ],
          "D",
          "C",
        ),
      ).toBe(false);
    });

    it("detects indirect cycle through multiple hops", () => {
      const existing: [string, string][] = [
        ["A", "B"],
        ["B", "C"],
        ["C", "D"],
        ["D", "E"],
      ];
      expect(wouldCreateCycle(existing, "E", "A")).toBe(true);
    });
  });
});
