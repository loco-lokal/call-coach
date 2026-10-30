export type Option = { id: string; label: string; target: string | null };
export type FlowNode = { id: string; isStart: boolean } & (
  | { type: "talking_point"; text: string; next: string | null }
  | { type: "switch"; name: string; options: Option[] }
);
export type Definition = {
  schemaVersion: 1;
  nodes: FlowNode[];
  layout?: { positions: Record<string, { x: number; y: number }> };
};
export type Issue = {
  code: string;
  message: string;
  nodeId?: string;
  optionId?: string;
  field?: string;
};
export type Script = {
  id: string;
  name: string;
  definition: Definition;
  revision: number;
  validation: Issue[];
  runnable: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
};
export type Group = { firstNodeId: string; secondNodeId?: string };
export type Progress = {
  groups: Group[];
  activeGroupIndex: number;
  choices: Record<string, string>;
  retainedNodeIds: string[];
};
export type RunState = {
  progress: Progress;
  callNotes: string;
  phase: "in_progress" | "evaluating";
  outcome: "success" | "failure" | null;
  evaluationNotes: string;
};
export type Run = Omit<RunState, "phase"> & {
  id: string;
  sourceScriptId: string;
  sourceRevision: number;
  scriptName: string;
  snapshot: Definition;
  lead: { name: string; company: string; phone: string };
  phase: "in_progress" | "evaluating" | "completed";
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
  revision: number;
};
export const index = (d: Definition) => new Map(d.nodes.map((n) => [n.id, n]));
export function group(
  d: Definition,
  firstNodeId: string,
  choices: Record<string, string>,
): Group {
  const n = index(d).get(firstNodeId);
  let second: string | null | undefined;
  if (n?.type === "switch")
    second = n.options.find((o) => o.id === choices[n.id])?.target;
  else second = n?.next;
  return { firstNodeId, ...(second ? { secondNodeId: second } : {}) };
}
const retained = (groups: Group[]) =>
  groups.flatMap((g) => [
    g.firstNodeId,
    ...(g.secondNodeId ? [g.secondNodeId] : []),
  ]);
export function initial(d: Definition, start?: string): Progress {
  const first = start || d.nodes.find((n) => n.isStart)?.id || "";
  const groups = [group(d, first, {})];
  return {
    groups,
    activeGroupIndex: 0,
    choices: {},
    retainedNodeIds: retained(groups),
  };
}
export function nextId(d: Definition, p: Progress): string | null {
  const g = p.groups[p.activeGroupIndex];
  if (!g) return null;
  const n = index(d).get(g.secondNodeId || g.firstNodeId);
  return n && n.type !== "switch" ? n.next : null;
}
export function advance(d: Definition, p: Progress): Progress {
  const id = nextId(d, p);
  if (!id) return p;
  if (p.groups[p.activeGroupIndex + 1]?.firstNodeId === id)
    return { ...p, activeGroupIndex: p.activeGroupIndex + 1 };
  const groups = [
    ...p.groups.slice(0, p.activeGroupIndex + 1),
    group(d, id, p.choices),
  ];
  return {
    ...p,
    groups,
    activeGroupIndex: groups.length - 1,
    retainedNodeIds: retained(groups),
  };
}
export function choose(
  d: Definition,
  p: Progress,
  nodeId: string,
  optionId: string,
): Progress {
  const m = index(d),
    n = m.get(nodeId),
    g = p.groups[p.activeGroupIndex];
  if (
    n?.type !== "switch" ||
    !g ||
    ![g.firstNodeId, g.secondNodeId].includes(nodeId)
  )
    return p;
  const target = n.options.find((o) => o.id === optionId)?.target;
  if (!target) return p;
  const changed = p.choices[nodeId] !== optionId;
  let choices = { ...p.choices };
  let groups = [...p.groups];
  if (changed) {
    const cut = p.retainedNodeIds.indexOf(nodeId);
    for (const id of p.retainedNodeIds.slice(cut + 1)) delete choices[id];
    groups = groups.slice(0, p.activeGroupIndex + 1);
  }
  choices[nodeId] = optionId;
  if (g.firstNodeId === nodeId) {
    groups[p.activeGroupIndex] = { firstNodeId: nodeId, secondNodeId: target };
    return { ...p, groups, choices, retainedNodeIds: retained(groups) };
  }
  if (!changed && groups[p.activeGroupIndex + 1]?.firstNodeId === target)
    return { ...p, choices, activeGroupIndex: p.activeGroupIndex + 1 };
  groups = [
    ...groups.slice(0, p.activeGroupIndex + 1),
    group(d, target, choices),
  ];
  return {
    groups,
    choices,
    activeGroupIndex: groups.length - 1,
    retainedNodeIds: retained(groups),
  };
}
export function back(p: Progress): Progress {
  return { ...p, activeGroupIndex: Math.max(0, p.activeGroupIndex - 1) };
}
export function canAdvance(d: Definition, p: Progress): boolean {
  const g = p.groups[p.activeGroupIndex];
  if (!g) return false;
  const m = index(d);
  return (
    [g.firstNodeId, g.secondNodeId].filter(Boolean).every((id) => {
      const n = m.get(id!);
      return n?.type !== "switch" || !!p.choices[id!];
    }) && !!nextId(d, p)
  );
}
export function stateOf(r: Run): RunState {
  return {
    progress: r.progress,
    callNotes: r.callNotes,
    phase: r.phase === "completed" ? "evaluating" : r.phase,
    outcome: r.outcome,
    evaluationNotes: r.evaluationNotes,
  };
}
export const emptyDefinition: Definition = {
  schemaVersion: 1,
  nodes: [],
  layout: { positions: {} },
};

// Upgrade locally retained drafts without losing node identity, text or connections.
export function normalizeDefinition(value: Definition): Definition {
  return {
    ...value,
    nodes: value.nodes.map((node) =>
      (node as { type: string }).type === "question"
        ? ({ ...node, type: "talking_point" } as FlowNode)
        : node,
    ),
  };
}
