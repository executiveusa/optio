"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Loader2, Plus, GitMerge, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkflows = () => {
    api
      .listWorkflows()
      .then((res) => setWorkflows(res.workflows))
      .catch(() => toast.error("Failed to load workflows"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete workflow "${name}"?`)) return;
    try {
      await api.deleteWorkflow(id);
      toast.success("Workflow deleted");
      loadWorkflows();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading workflows...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
        <Link
          href="/workflows/new"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <GitMerge className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No workflows yet. Create one to chain tasks together.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf: any) => (
            <div
              key={wf.id}
              className="flex items-center gap-4 p-4 rounded-lg border border-border bg-bg-card hover:bg-bg-hover transition-colors"
            >
              <GitMerge className="w-5 h-5 text-primary shrink-0" />
              <Link href={`/workflows/${wf.id}`} className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{wf.name}</div>
                {wf.description && (
                  <div className="text-xs text-text-muted mt-0.5 truncate">{wf.description}</div>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-text-muted/60">
                  <span>{wf.steps?.length ?? 0} steps</span>
                  <span>{formatRelativeTime(wf.createdAt)}</span>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(wf.id, wf.name)}
                className="p-2 rounded-md hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                title="Delete workflow"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
