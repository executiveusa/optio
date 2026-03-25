/**
 * Validates that a directed graph has no cycles (is a DAG).
 * Uses Kahn's algorithm (topological sort via BFS).
 *
 * @param edges Array of [from, to] edges
 * @returns { valid: true } or { valid: false, cycle: string[] }
 */
export type DAGValidationResult =
  | { valid: true; cycle?: undefined }
  | { valid: false; cycle: string[] };

export function validateDAG(edges: Array<[string, string]>): DAGValidationResult {
  const adjList = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const nodes = new Set<string>();

  // Build adjacency list and in-degree map
  for (const [from, to] of edges) {
    nodes.add(from);
    nodes.add(to);

    if (!adjList.has(from)) adjList.set(from, new Set());
    adjList.get(from)!.add(to);

    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    if (!inDegree.has(from)) inDegree.set(from, 0);
  }

  // Start BFS with nodes that have no incoming edges
  const queue: string[] = [];
  for (const node of nodes) {
    if ((inDegree.get(node) ?? 0) === 0) {
      queue.push(node);
    }
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    for (const neighbor of adjList.get(node) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sorted.length === nodes.size) {
    return { valid: true };
  }

  // Find nodes involved in cycles (those not in sorted output)
  const cycle = [...nodes].filter((n) => !sorted.includes(n));
  return { valid: false, cycle };
}

/**
 * Check if adding an edge would create a cycle.
 * @param existingEdges Current edges in the graph
 * @param from Source node
 * @param to Target node
 * @returns true if adding the edge would create a cycle
 */
export function wouldCreateCycle(
  existingEdges: Array<[string, string]>,
  from: string,
  to: string,
): boolean {
  const result = validateDAG([...existingEdges, [from, to]]);
  return !result.valid;
}
