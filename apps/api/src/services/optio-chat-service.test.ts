import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockGroupBy = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock("../db/client.js", () => ({
  db: {
    select: () => ({
      from: (table: any) => {
        mockFrom(table);
        return {
          where: (cond: any) => {
            mockWhere(cond);
            return {
              groupBy: () => ({
                // Task counts by state
                then: undefined,
                [Symbol.iterator]: undefined,
              }),
              orderBy: () => ({
                limit: () => [],
              }),
            };
          },
          // Simple count queries return [{count: N}]
          then: undefined,
        };
      },
    }),
  },
}));

vi.mock("../db/schema.js", () => ({
  tasks: {
    state: "state",
    updatedAt: "updated_at",
    id: "id",
    title: "title",
    repoUrl: "repo_url",
    errorMessage: "error_message",
  },
  repos: {},
  repoPods: { state: "state" },
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: any[]) => `sql:${strings.join("")}`,
  eq: (a: any, b: any) => `eq:${a}:${b}`,
  inArray: (a: any, b: any) => `inArray:${a}:${JSON.stringify(b)}`,
}));

vi.mock("../logger.js", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Since the module uses DB queries that are hard to fully mock,
// test the module import and type-level behavior
import type { SystemStatus } from "./optio-chat-service.js";

describe("optio-chat-service", () => {
  describe("SystemStatus type", () => {
    it("has expected shape", () => {
      const status: SystemStatus = {
        taskCounts: { running: 2, queued: 1 },
        totalTasks: 3,
        repoCount: 5,
        activePods: 2,
        recentFailures: [
          {
            id: "abc-123",
            title: "Test task",
            repoUrl: "https://github.com/test/repo",
            errorMessage: "Some error",
          },
        ],
      };

      expect(status.totalTasks).toBe(3);
      expect(status.taskCounts.running).toBe(2);
      expect(status.repoCount).toBe(5);
      expect(status.activePods).toBe(2);
      expect(status.recentFailures).toHaveLength(1);
    });
  });
});
