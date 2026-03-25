import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as depService from "../services/dependency-service.js";

export async function dependencyRoutes(app: FastifyInstance) {
  // Get dependencies for a task (tasks it depends on)
  app.get("/api/tasks/:id/dependencies", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dependencies = await depService.getDependencies(id);
    reply.send({ dependencies });
  });

  // Get dependents of a task (tasks that depend on it)
  app.get("/api/tasks/:id/dependents", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dependents = await depService.getDependents(id);
    reply.send({ dependents });
  });

  // Check dependency status for a task
  app.get("/api/tasks/:id/dependencies/status", async (req, reply) => {
    const { id } = req.params as { id: string };
    const status = await depService.checkDependencyStatus(id);
    reply.send(status);
  });

  // Add a dependency
  app.post("/api/tasks/:id/dependencies", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ dependsOnTaskId: z.string().uuid() }).parse(req.body);
    try {
      const dependency = await depService.addDependency(id, body.dependsOnTaskId);
      reply.status(201).send({ dependency });
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Remove a dependency
  app.delete("/api/tasks/:id/dependencies/:depTaskId", async (req, reply) => {
    const { id, depTaskId } = req.params as { id: string; depTaskId: string };
    await depService.removeDependency(id, depTaskId);
    reply.status(204).send();
  });
}
