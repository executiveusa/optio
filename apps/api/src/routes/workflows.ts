import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as workflowService from "../services/workflow-service.js";

const conditionsSchema = z
  .object({
    ifPrOpened: z.boolean().optional(),
    ifCiPasses: z.boolean().optional(),
    ifCostBelow: z.number().optional(),
    requiresApproval: z.boolean().optional(),
  })
  .optional();

const stepSchema = z.object({
  stepOrder: z.number().int().min(0),
  title: z.string().min(1),
  prompt: z.string().min(1),
  agentType: z.enum(["claude-code", "codex"]).optional(),
  dependsOnSteps: z.array(z.number().int().min(0)).optional(),
  conditions: conditionsSchema,
});

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().optional(),
  steps: z.array(stepSchema).min(1),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  repoUrl: z.string().nullable().optional(),
  steps: z.array(stepSchema).optional(),
});

const executeWorkflowSchema = z.object({
  repoUrl: z.string().url(),
  repoBranch: z.string().optional(),
});

export async function workflowRoutes(app: FastifyInstance) {
  // List workflows
  app.get("/api/workflows", async (_req, reply) => {
    const workflows = await workflowService.listWorkflows();
    reply.send({ workflows });
  });

  // Get workflow
  app.get("/api/workflows/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const workflow = await workflowService.getWorkflow(id);
    if (!workflow) return reply.status(404).send({ error: "Workflow not found" });
    reply.send({ workflow });
  });

  // Create workflow
  app.post("/api/workflows", async (req, reply) => {
    const input = createWorkflowSchema.parse(req.body);
    try {
      const workflow = await workflowService.createWorkflow(input);
      reply.status(201).send({ workflow });
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Update workflow
  app.patch("/api/workflows/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const input = updateWorkflowSchema.parse(req.body);
    try {
      const workflow = await workflowService.updateWorkflow(id, input);
      reply.send({ workflow });
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Delete workflow
  app.delete("/api/workflows/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await workflowService.deleteWorkflow(id);
    reply.status(204).send();
  });

  // Execute workflow (create tasks from template)
  app.post("/api/workflows/:id/execute", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = executeWorkflowSchema.parse(req.body);
    try {
      const result = await workflowService.executeWorkflow({
        workflowId: id,
        repoUrl: body.repoUrl,
        repoBranch: body.repoBranch,
      });
      reply.status(201).send(result);
    } catch (err) {
      reply.status(400).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });
}
