import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the service
vi.mock("../db/client.js", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../db/schema.js", () => ({
  taskDependencies: {
    id: "task_dependencies.id",
    taskId: "task_dependencies.task_id",
    dependsOnTaskId: "task_dependencies.depends_on_task_id",
    createdAt: "task_dependencies.created_at",
  },
  tasks: {
    id: "tasks.id",
    title: "tasks.title",
    state: "tasks.state",
  },
}));

vi.mock("./task-service.js", () => ({
  getTask: vi.fn(),
  createTask: vi.fn(),
  transitionTask: vi.fn(),
}));

vi.mock("../workers/task-worker.js", () => ({
  taskQueue: {
    add: vi.fn(),
  },
}));

vi.mock("./event-bus.js", () => ({
  publishEvent: vi.fn(),
}));

vi.mock("../logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

import { db } from "../db/client.js";
import * as taskService from "./task-service.js";
import { taskQueue } from "../workers/task-worker.js";

// Helper to set up mock chain for db.select()
function mockDbSelect(results: any[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(results),
    then: (resolve: any) => resolve(results),
    [Symbol.iterator]: () => results[Symbol.iterator](),
  };
  (db.select as any).mockReturnValue(chain);
  // Make the chain thenable so await works
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  return chain;
}

function mockDbInsert(result: any = undefined) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(result ? [result] : []),
  };
  (db.insert as any).mockReturnValue(chain);
  return chain;
}

function mockDbDelete() {
  const chain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  (db.delete as any).mockReturnValue(chain);
  return chain;
}

describe("dependency-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addDependencies", () => {
    it("throws on self-dependency", async () => {
      const { addDependencies } = await import("./dependency-service.js");
      await expect(addDependencies("task-1", ["task-1"])).rejects.toThrow(
        "A task cannot depend on itself",
      );
    });

    it("throws when dependency task does not exist", async () => {
      (taskService.getTask as any).mockResolvedValue(null);
      const { addDependencies } = await import("./dependency-service.js");
      await expect(addDependencies("task-1", ["missing-task"])).rejects.toThrow(
        "Dependency task not found: missing-task",
      );
    });
  });

  describe("addDependency", () => {
    it("throws on self-dependency", async () => {
      const { addDependency } = await import("./dependency-service.js");
      await expect(addDependency("task-1", "task-1")).rejects.toThrow(
        "A task cannot depend on itself",
      );
    });

    it("throws when dependency task does not exist", async () => {
      (taskService.getTask as any).mockResolvedValue(null);
      const { addDependency } = await import("./dependency-service.js");
      await expect(addDependency("task-1", "missing-task")).rejects.toThrow(
        "Dependency task not found: missing-task",
      );
    });
  });

  describe("checkDependencyStatus", () => {
    it("returns allMet:true when there are no dependencies", async () => {
      // Mock getDependencies returning empty
      const selectChain = mockDbSelect([]);

      const { checkDependencyStatus } = await import("./dependency-service.js");
      const result = await checkDependencyStatus("task-1");
      expect(result.allMet).toBe(true);
      expect(result.total).toBe(0);
    });
  });

  describe("onTaskFailed (cascade)", () => {
    it("cascade-fails pending dependents", async () => {
      // Setup: task-2 depends on task-1, task-2 is pending
      const mockDependents = [
        {
          id: "dep-1",
          taskId: "task-2",
          createdAt: new Date(),
          taskTitle: "Task 2",
          taskState: "pending",
        },
      ];
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
      };

      let selectCallCount = 0;
      (db.select as any).mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // getDependents for task-1
          selectChain.leftJoin = vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockDependents),
          });
          return selectChain;
        }
        // getDependents for task-2 (recursive call - no dependents)
        selectChain.leftJoin = vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        });
        return selectChain;
      });

      (taskService.getTask as any).mockResolvedValue({
        id: "task-2",
        state: "pending",
        priority: 100,
        maxRetries: 3,
      });

      (taskService.transitionTask as any).mockResolvedValue({});

      const { onTaskFailed } = await import("./dependency-service.js");
      await onTaskFailed("task-1");

      // Should have transitioned task-2: pending → queued → failed
      expect(taskService.transitionTask).toHaveBeenCalledWith(
        "task-2",
        "queued",
        "cascade_fail_prep",
      );
      expect(taskService.transitionTask).toHaveBeenCalledWith(
        "task-2",
        "failed",
        "dependency_failed",
        "Dependency task task-1 failed",
      );
    });
  });
});
