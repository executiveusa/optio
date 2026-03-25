export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepOrder: number;
  title: string;
  prompt: string;
  agentType: string;
  dependsOnSteps: number[];
  conditions?: WorkflowStepConditions;
  createdAt: Date;
}

export interface WorkflowStepConditions {
  ifPrOpened?: boolean;
  ifCiPasses?: boolean;
  ifCostBelow?: number;
  requiresApproval?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  repoUrl?: string;
  createdBy?: string;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  repoUrl?: string;
  steps: Array<{
    stepOrder: number;
    title: string;
    prompt: string;
    agentType?: string;
    dependsOnSteps?: number[];
    conditions?: WorkflowStepConditions;
  }>;
}

export interface ExecuteWorkflowInput {
  workflowId: string;
  repoUrl: string;
  repoBranch?: string;
}
