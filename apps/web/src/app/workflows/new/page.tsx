"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StepInput {
  stepOrder: number;
  title: string;
  prompt: string;
  agentType: string;
  dependsOnSteps: number[];
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [steps, setSteps] = useState<StepInput[]>([
    { stepOrder: 0, title: "", prompt: "", agentType: "claude-code", dependsOnSteps: [] },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addStep = () => {
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.stepOrder)) + 1 : 0;
    setSteps([
      ...steps,
      { stepOrder: nextOrder, title: "", prompt: "", agentType: "claude-code", dependsOnSteps: [] },
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    const removed = steps[index];
    setSteps(
      steps
        .filter((_, i) => i !== index)
        .map((s) => ({
          ...s,
          dependsOnSteps: s.dependsOnSteps.filter((d) => d !== removed.stepOrder),
        })),
    );
  };

  const updateStep = (index: number, field: keyof StepInput, value: any) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const toggleDep = (stepIndex: number, depOrder: number) => {
    const step = steps[stepIndex];
    const deps = step.dependsOnSteps.includes(depOrder)
      ? step.dependsOnSteps.filter((d) => d !== depOrder)
      : [...step.dependsOnSteps, depOrder];
    updateStep(stepIndex, "dependsOnSteps", deps);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (steps.some((s) => !s.title.trim() || !s.prompt.trim())) {
      toast.error("All steps need a title and prompt");
      return;
    }

    setSubmitting(true);
    try {
      await api.createWorkflow({
        name,
        description: description || undefined,
        repoUrl: repoUrl || undefined,
        steps: steps.map((s) => ({
          stepOrder: s.stepOrder,
          title: s.title,
          prompt: s.prompt,
          agentType: s.agentType,
          dependsOnSteps: s.dependsOnSteps.length > 0 ? s.dependsOnSteps : undefined,
        })),
      });
      toast.success("Workflow created");
      router.push("/workflows");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">New Workflow</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-text-muted mb-1.5">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Refactor + Test + Deploy"
            className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1.5">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1.5">
            Repository URL{" "}
            <span className="text-xs text-text-muted/60">(optional, limits to specific repo)</span>
          </label>
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full px-3 py-2 rounded-lg bg-bg-card border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="border-t border-border pt-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Steps</h2>
            <button
              onClick={addStep}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </button>
          </div>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-text-muted">Step {step.stepOrder}</span>
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(i)}
                      className="p-1 rounded hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(i, "title", e.target.value)}
                    placeholder="Step title"
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />

                  <textarea
                    value={step.prompt}
                    onChange={(e) => updateStep(i, "prompt", e.target.value)}
                    placeholder="Agent prompt for this step"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm resize-y focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-text-muted mb-1">Agent</label>
                      <select
                        value={step.agentType}
                        onChange={(e) => updateStep(i, "agentType", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="claude-code">Claude Code</option>
                        <option value="codex">OpenAI Codex</option>
                      </select>
                    </div>

                    {steps.length > 1 && (
                      <div className="flex-1">
                        <label className="block text-xs text-text-muted mb-1">Depends on</label>
                        <div className="flex flex-wrap gap-1.5">
                          {steps
                            .filter((_, j) => j !== i)
                            .map((other) => (
                              <button
                                key={other.stepOrder}
                                onClick={() => toggleDep(i, other.stepOrder)}
                                className={`px-2 py-1 rounded text-xs border transition-colors ${
                                  step.dependsOnSteps.includes(other.stepOrder)
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-text-muted hover:border-primary/50"
                                }`}
                              >
                                Step {other.stepOrder}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
