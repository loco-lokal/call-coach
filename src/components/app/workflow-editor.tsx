"use client";
import { createId } from "../../lib/id";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Handle,
  Position,
  Controls,
  applyNodeChanges,
  useUpdateNodeInternals,
  type Connection,
  type Node as CanvasNode,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button, Badge, Field, TextArea, Modal, Icon } from "../ui";
import { api, json } from "../../lib/api";
import {
  normalizeDefinition,
  type Script,
  type FlowNode,
  type Definition,
  type Issue,
} from "../../lib/domain";
import { useDraft } from "../../lib/use-draft";
import { LeaveGuard } from "./shell";
import { SyncStatus } from "./sync-status";
import { TestRun } from "./test-run";

type Value = { name: string; definition: Definition };
type EditorData = {
  node: FlowNode;
  issues: Issue[];
  edit: () => void;
  test: () => void;
  finishConnection: () => void;
  addFrom: (handle: string, label: string, anchor: HTMLElement) => void;
};
type GraphNode = CanvasNode<EditorData, "coach">;
type AddFrom = {
  source: string;
  handle: string;
  label: string;
  anchor: HTMLElement;
};

function AddNodePopover({
  from,
  allowSwitch,
  onAdd,
  onExisting,
  onClose,
}: {
  from: AddFrom;
  allowSwitch: boolean;
  onAdd: (type: FlowNode["type"]) => void;
  onExisting: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const panel = ref.current!;
    panel.showPopover();
    const anchor = from.anchor.getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(12, Math.min(anchor.right + 12, window.innerWidth - box.width - 12))}px`;
    panel.style.top = `${Math.max(12, Math.min(anchor.top - 12, window.innerHeight - box.height - 12))}px`;
    panel.querySelector<HTMLButtonElement>("[data-choice]")?.focus();
    const dismiss = () => {
      panel.hidePopover();
    };
    window.addEventListener("resize", dismiss);
    // Panning/zooming must not leave the picker detached from its handle.
    window.addEventListener("wheel", dismiss, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("wheel", dismiss, true);
    };
  }, [from]);
  const choose = (action: () => void) => {
    from.anchor.focus();
    action();
  };
  return createPortal(
    <div
      ref={ref}
      popover="auto"
      role="dialog"
      aria-label="Add next node"
      className="node-add-popover"
      onToggle={(e) => {
        if (e.newState === "closed") onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          from.anchor.focus();
          ref.current?.hidePopover();
        }
      }}
    >
      <div className="node-add-heading">
        <strong>Add next node</strong>
        <Button
          variant="ghost"
          aria-label="Close add node"
          onClick={() => {
            from.anchor.focus();
            ref.current?.hidePopover();
          }}
        >
          <Icon name="close" />
        </Button>
      </div>
      <button
        type="button"
        data-choice
        onClick={() => choose(() => onAdd("talking_point"))}
      >
        <Icon name="message" />
        Talking point
      </button>
      <button
        type="button"
        disabled={!allowSwitch}
        onClick={() => choose(() => onAdd("switch"))}
      >
        <Icon name="branch" />
        Switch
      </button>
      {!allowSwitch && <p>Add a talking point before another switch.</p>}
      <button
        type="button"
        className="connect-existing"
        onClick={() => choose(onExisting)}
      >
        <Icon name="arrow" />
        Connect to existing node
      </button>
    </div>,
    document.body,
  );
}

function OutgoingHandle({
  data,
  handle,
  label,
  option = false,
}: {
  data: EditorData;
  handle: string;
  label: string;
  option?: boolean;
}) {
  const gesture = useRef({
    moved: false,
    controller: null as AbortController | null,
  });
  useEffect(() => () => gesture.current.controller?.abort(), []);
  return (
    <Handle
      type="source"
      position={Position.Right}
      id={handle}
      role="button"
      tabIndex={0}
      className="handle-add"
      aria-label={option ? `Add node for ${label}` : "Add next node"}
      aria-haspopup="dialog"
      title="Add a node, or drag to connect"
      style={option ? { right: -22, top: "50%" } : undefined}
      onPointerDownCapture={(e) => {
        gesture.current.controller?.abort();
        const controller = new AbortController();
        const start = { x: e.clientX, y: e.clientY };
        gesture.current = { moved: false, controller };
        window.addEventListener(
          "pointermove",
          (move) => {
            if (
              Math.hypot(move.clientX - start.x, move.clientY - start.y) > 5
            ) {
              gesture.current.moved = true;
            }
          },
          { signal: controller.signal, passive: true },
        );
        const finish = () => controller.abort();
        window.addEventListener("pointerup", finish, {
          signal: controller.signal,
          once: true,
        });
        window.addEventListener("pointercancel", finish, {
          signal: controller.signal,
          once: true,
        });
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (e.detail > 0 && gesture.current.moved) return;
        data.addFrom(handle, label, e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          data.addFrom(handle, label, e.currentTarget);
        }
      }}
    >
      <Icon name="plus" />
    </Handle>
  );
}
function NodeView({ data, selected }: NodeProps<GraphNode>) {
  const n = data.node;
  const updateNodeInternals = useUpdateNodeInternals();
  const geometry =
    n.type === "switch"
      ? JSON.stringify([n.name, n.options.map((o) => [o.id, o.label])])
      : n.text;
  useEffect(() => {
    updateNodeInternals(n.id);
  }, [n.id, geometry, updateNodeInternals]);
  return (
    <div className={`editor-node-wrap ${selected ? "is-selected" : ""}`}>
      <Button
        className="node-test nodrag"
        onClick={data.test}
        aria-label={`Test ${n.type === "switch" ? n.name : n.text}`}
      >
        {" "}
        <Icon name="play" />
        Test from here
      </Button>
      <article
        className={`editor-node ${data.issues.length ? "has-error" : ""}`}
        tabIndex={0}
        aria-label={`${n.type === "switch" ? "Switch" : "Talking point"} workflow node`}
        onDoubleClick={data.edit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            data.edit();
          }
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          aria-label={`Incoming connection to ${n.type === "switch" ? n.name : n.text || "talking point"}`}
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            data.finishConnection();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              data.finishConnection();
            }
          }}
        />
        <div className="editor-node-heading">
          <span className="node-label">
            <Icon name={n.type === "switch" ? "branch" : "message"} />
            {n.type === "switch" ? "Switch" : "Talking point"}
          </span>
          {n.isStart && <Badge tone="green">Start</Badge>}
        </div>
        <p className="workflow-node-text">
          {n.type === "switch" ? n.name : n.text || "Add text"}
        </p>
        {n.type === "switch" ? (
          <ul className="editor-options">
            {n.options.map((o) => (
              <li key={o.id} style={{ position: "relative" }}>
                <span>{o.label || "Unnamed option"}</span>
                <OutgoingHandle
                  data={data}
                  handle={o.id}
                  label={o.label}
                  option
                />
              </li>
            ))}
          </ul>
        ) : (
          <OutgoingHandle
            data={data}
            handle="next"
            label={n.text || "talking point"}
          />
        )}
        {data.issues.length > 0 && (
          <div className="node-error">
            <Icon name="alert" />
            <span>{data.issues[0].message}</span>
          </div>
        )}
        <div className="editor-node-footer">
          <Button
            variant="ghost"
            className="nodrag"
            onClick={(e) => {
              e.stopPropagation();
              data.edit();
            }}
            aria-label="Edit node"
          >
            <Icon name="edit" />
            Edit
          </Button>
        </div>
      </article>
    </div>
  );
}
const nodeTypes = { coach: NodeView };
function NodeEditor({
  node,
  onApply,
  onDelete,
  onClose,
}: {
  node: FlowNode;
  onApply: (n: FlowNode) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [n, setN] = useState(() => structuredClone(node));
  return (
    <Modal
      open
      title={`Edit ${n.type === "switch" ? "switch" : "talking point"}`}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onApply(n);
        }}
      >
        {n.type === "switch" ? (
          <>
            <Field
              label="Switch name"
              value={n.name}
              maxLength={2000}
              onChange={(e) => setN({ ...n, name: e.target.value })}
            />
            {n.options.map((o, i) => (
              <div key={o.id} className="option-editor">
                <Field
                  label={`Option ${i + 1} label`}
                  value={o.label}
                  maxLength={2000}
                  onChange={(e) =>
                    setN({
                      ...n,
                      options: n.options.map((x) =>
                        x.id === o.id ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <Button
                  variant="ghost"
                  onClick={() =>
                    setN({
                      ...n,
                      options: n.options.filter((x) => x.id !== o.id),
                    })
                  }
                >
                  Remove option {i + 1}
                </Button>
              </div>
            ))}
            <Button
              onClick={() =>
                setN({
                  ...n,
                  options: [
                    ...n.options,
                    { id: createId(), label: "", target: null },
                  ],
                })
              }
            >
              Add option
            </Button>
          </>
        ) : (
          <>
            <TextArea
              label="Node text"
              value={n.text}
              maxLength={20000}
              rows={6}
              onChange={(e) => setN({ ...n, text: e.target.value })}
            />
          </>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={n.isStart}
            onChange={(e) => setN({ ...n, isStart: e.target.checked })}
          />
          Conversation start
        </label>
        <p className="subtle">
          Exactly one start is required for a normal call. Link nodes using
          their canvas handles.
        </p>
        <div className="button-row">
          <Button variant="danger" onClick={onDelete}>
            Delete node
          </Button>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            Apply changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function WorkflowEditor({ id }: { id: string }) {
  const sync = useDraft<Value, Script>({
    key: `script:${id}`,
    mode: "script",
    normalize: (value) => ({
      ...value,
      definition: normalizeDefinition(value.definition),
    }),
    load: () => api(`/scripts/${id}`),
    extract: (s) => ({ name: s.name, definition: s.definition }),
    save: (v, rev) =>
      api(`/scripts/${id}`, {
        method: "PUT",
        body: json({ ...v, expectedRevision: rev }),
      }),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [addFrom, setAddFrom] = useState<AddFrom | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{
    source: string;
    handle: string;
    label: string;
  } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [instance, setInstance] = useState<ReactFlowInstance<GraphNode> | null>(
    null,
  );
  const [testing, setTesting] = useState<{
    script: Script;
    start: string;
  } | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [error, setError] = useState("");
  const v = sync.value,
    d = v?.definition;
  const update = useCallback(
    (definition: Definition) => {
      if (v) sync.change({ ...v, definition });
    },
    [sync, v],
  );
  const edit = (node: FlowNode) => {
    setSelected(node.id);
    setEditing(node.id);
  };
  async function test(start: string) {
    setTestBusy(true);
    setError("");
    try {
      await sync.flush();
      if (sync.status === "conflict")
        throw new Error("Resolve the revision conflict before testing.");
      const saved = await api<Script>(`/scripts/${id}`);
      setTesting({ script: saved, start });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTestBusy(false);
    }
  }
  const [flowNodes, setFlowNodes] = useState<GraphNode[]>([]);
  const liveActions = useRef({ edit, test, connect, pendingConnection });
  liveActions.current = { edit, test, connect, pendingConnection };
  // Keep React Flow's measured sizes and drag metadata. Recreating bare nodes
  // during a drag invalidates their handle bounds and makes them disappear.
  useEffect(() => {
    setFlowNodes((current) => {
      const previous = new Map(current.map((n) => [n.id, n]));
      return d
        ? d.nodes.map((node, i) => {
            const prior = previous.get(node.id);
            return {
              ...prior,
              id: node.id,
              type: "coach",
              position: prior?.dragging
                ? prior.position
                : d.layout?.positions?.[node.id] || {
                    x: (i % 4) * 360,
                    y: Math.floor(i / 4) * 340,
                  },
              selected: selected === node.id,
              data: {
                node,
                issues:
                  sync.resource?.validation.filter(
                    (e) => e.nodeId === node.id,
                  ) || [],
                edit: () => liveActions.current.edit(node),
                test: () => void liveActions.current.test(node.id),
                addFrom: (handle, label, anchor) => {
                  setPendingConnection(null);
                  setAddFrom({ source: node.id, handle, label, anchor });
                },
                finishConnection: () => {
                  const pending = liveActions.current.pendingConnection;
                  if (pending)
                    liveActions.current.connect({
                      source: pending.source,
                      sourceHandle: pending.handle,
                      target: node.id,
                      targetHandle: "in",
                    });
                },
              },
            };
          })
        : [];
    });
  }, [d, selected, sync.resource]);
  useEffect(() => {
    if (!instance || !d?.nodes.length) return;
    void instance.fitView({ padding: 0.25, maxZoom: 1 });
  }, [instance, d?.nodes.length]);
  const edges = useMemo(
    () =>
      d
        ? d.nodes.flatMap((n) =>
            (n.type === "switch"
              ? n.options.map((o) => ({
                  handle: o.id,
                  target: o.target,
                  label: o.label,
                }))
              : [{ handle: "next", target: n.next, label: undefined }]
            )
              .filter(
                (o) => !!o.target && d.nodes.some((x) => x.id === o.target),
              )
              .map((o) => ({
                id: JSON.stringify([n.id, o.handle]),
                source: n.id,
                target: o.target!,
                sourceHandle: o.handle,
                targetHandle: "in",
                label: o.label,
                style: { stroke: "#fefefe", strokeWidth: 2 },
                labelStyle: { fill: "#120e20" },
                labelBgStyle: { fill: "#fefefe" },
                labelBgBorderRadius: 6,
              })),
          )
        : [],
    [d],
  );
  function connect(connection: Connection) {
    if (!d || !connection.source || !connection.target) return;
    update({
      ...d,
      nodes: d.nodes.map((n) =>
        n.id !== connection.source
          ? n
          : n.type === "switch"
            ? {
                ...n,
                options: n.options.map((o) =>
                  o.id === connection.sourceHandle
                    ? { ...o, target: connection.target }
                    : o,
                ),
              }
            : { ...n, next: connection.target },
      ),
    });
    setPendingConnection(null);
  }
  function removeNodes(ids: string[]) {
    if (!d) return;
    const positions = { ...d.layout?.positions };
    for (const id of ids) delete positions[id];
    update({
      ...d,
      nodes: d.nodes
        .filter((n) => !ids.includes(n.id))
        .map((n) =>
          n.type === "switch"
            ? {
                ...n,
                options: n.options.map((o) => ({
                  ...o,
                  target: o.target && ids.includes(o.target) ? null : o.target,
                })),
              }
            : { ...n, next: n.next && ids.includes(n.next) ? null : n.next },
        ),
      layout: { positions },
    });
    setEditing(null);
    setSelected(null);
  }
  function add(type: FlowNode["type"], from?: AddFrom) {
    if (!d) return;
    const source = from ? d.nodes.find((n) => n.id === from.source) : undefined;
    if (
      from &&
      (!source ||
        (source.type === "switch" &&
          !source.options.some((o) => o.id === from.handle)))
    )
      return;
    if (source?.type === "switch" && type === "switch") return;
    const previousTarget =
      source?.type === "switch"
        ? source.options.find((o) => o.id === from?.handle)?.target
        : source?.next;
    const node: FlowNode =
      type === "switch"
        ? {
            id: createId(),
            type,
            isStart: d.nodes.length === 0,
            name: "New switch",
            options: [
              {
                id: createId(),
                label: "Option one",
                target: previousTarget ?? null,
              },
              { id: createId(), label: "Option two", target: null },
            ],
          }
        : {
            id: createId(),
            type,
            isStart: d.nodes.length === 0,
            text: "",
            next: previousTarget ?? null,
          };
    const last = d.nodes[d.nodes.length - 1];
    const previous = last ? d.layout?.positions?.[last.id] : undefined;
    const center = instance?.screenToFlowPosition({
      x: window.innerWidth / 2 - 140,
      y: window.innerHeight / 2 - 60,
    }) || { x: 0, y: 0 };
    let position = last
      ? {
          x: (previous?.x ?? ((d.nodes.length - 1) % 4) * 360) + 360,
          y: previous?.y ?? Math.floor((d.nodes.length - 1) / 4) * 340,
        }
      : center;
    if (source) {
      const i = d.nodes.indexOf(source);
      const origin = d.layout?.positions?.[source.id] || {
        x: (i % 4) * 360,
        y: Math.floor(i / 4) * 340,
      };
      const branch =
        source.type === "switch"
          ? source.options.findIndex((o) => o.id === from?.handle)
          : 0;
      position = { x: origin.x + 380, y: origin.y + Math.max(branch, 0) * 280 };
      while (
        d.nodes.some((existing, idx) => {
          const p = d.layout?.positions?.[existing.id] || {
            x: (idx % 4) * 360,
            y: Math.floor(idx / 4) * 340,
          };
          const height =
            instance?.getNode(existing.id)?.measured?.height || 260;
          return (
            position.x < p.x + 300 &&
            position.x + 300 > p.x &&
            position.y < p.y + height + 20 &&
            position.y + 260 > p.y
          );
        })
      )
        position.y += 280;
    }
    update({
      ...d,
      nodes: [
        ...d.nodes.map((n) =>
          n.id !== source?.id
            ? n
            : n.type === "switch"
              ? {
                  ...n,
                  options: n.options.map((o) =>
                    o.id === from?.handle ? { ...o, target: node.id } : o,
                  ),
                }
              : { ...n, next: node.id },
        ),
        node,
      ],
      layout: { positions: { ...d.layout?.positions, [node.id]: position } },
    });
    setSelected(node.id);
    setEditing(node.id);
    setAddFrom(null);
  }
  if (sync.deleted)
    return (
      <main className="app-main">
        <h1>Script unavailable</h1>
        <p role="alert">{sync.message}</p>
        <a href="/scripts">Back to scripts</a>
      </main>
    );
  if (testing)
    return (
      <TestRun
        script={testing.script}
        start={testing.start}
        onClose={() => setTesting(null)}
      />
    );
  return (
    <main
      className="workflow-editor"
      onKeyDown={(e) => {
        if (e.key === "Escape") setPendingConnection(null);
      }}
    >
      <h1 className="sr-only">Workflow editor</h1>
      <LeaveGuard dirty={sync.dirty} />
      <header className="workflow-toolbar">
        <a className="button button--ghost" href="/scripts">
          <Icon name="back" />
          Scripts
        </a>
        {v ? (
          <Field
            label="Script name"
            value={v.name}
            maxLength={200}
            onChange={(e) => sync.change({ ...v, name: e.target.value })}
          />
        ) : (
          <p>Loading script…</p>
        )}
        <div className="button-row">
          <Button onClick={() => add("talking_point")} disabled={!d}>
            Add talking point
          </Button>
          <Button onClick={() => add("switch")} disabled={!d}>
            Add switch
          </Button>
          <Button
            busy={sync.status === "saving"}
            disabled={!d || sync.status === "conflict"}
            onClick={() => void sync.flush().catch(() => {})}
          >
            Save now
          </Button>
          <Button
            variant="primary"
            disabled={!sync.resource?.runnable || sync.dirty()}
            onClick={() => location.assign(`/scripts/${id}/call`)}
          >
            Start call
          </Button>
        </div>
      </header>
      {error && (
        <p role="alert" className="app-error">
          {error}
        </p>
      )}
      <div className="workflow-canvas" aria-label="Workflow canvas">
        {d && (
          <ReactFlow<GraphNode>
            nodes={flowNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={setInstance}
            onNodeClick={(_, n) => setSelected(n.id)}
            onNodeDoubleClick={(_, n) => setEditing(n.id)}
            onPaneClick={() => setSelected(null)}
            onConnect={connect}
            connectOnClick={false}
            onNodesChange={(changes) => {
              setFlowNodes((nodes) => applyNodeChanges(changes, nodes));
              const positions = { ...d.layout?.positions };
              let finishedMove = false;
              for (const change of changes) {
                if (change.type === "select" && change.selected)
                  setSelected(change.id);
                // Drag frames stay local; final drags and keyboard moves save.
                if (
                  change.type === "position" &&
                  change.position &&
                  change.dragging !== true
                ) {
                  positions[change.id] = {
                    x: change.position.x,
                    y: change.position.y,
                  };
                  finishedMove = true;
                }
              }
              if (finishedMove) update({ ...d, layout: { positions } });
            }}
            onNodesDelete={(nodes) => removeNodes(nodes.map((n) => n.id))}
            onEdgesDelete={(removed) => {
              const keys = new Set(
                removed.map((e) => JSON.stringify([e.source, e.sourceHandle])),
              );
              update({
                ...d,
                nodes: d.nodes.map((n) =>
                  n.type === "switch"
                    ? {
                        ...n,
                        options: n.options.map((o) =>
                          keys.has(JSON.stringify([n.id, o.id]))
                            ? { ...o, target: null }
                            : o,
                        ),
                      }
                    : keys.has(JSON.stringify([n.id, "next"]))
                      ? { ...n, next: null }
                      : n,
                ),
              });
            }}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
            minZoom={0.15}
            maxZoom={2}
            deleteKeyCode={["Backspace", "Delete"]}
          >
            <Controls
              showInteractive={false}
              fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
            />
          </ReactFlow>
        )}
        {d?.nodes.length === 0 && (
          <div className="canvas-empty">
            <h2>Start with a talking point.</h2>
            <p>
              Add a node above. Drag between handles to connect the
              conversation.
            </p>
          </div>
        )}
        {testBusy && (
          <p className="canvas-notice" role="status">
            Saving the latest definition before testing…
          </p>
        )}
        {pendingConnection && (
          <p className="canvas-notice" role="status">
            Connect {pendingConnection.label}: tap an incoming handle, or focus
            it and press Enter. Press Escape to cancel.
          </p>
        )}
      </div>
      <footer className="workflow-status">
        <SyncStatus
          {...sync}
          localValue={sync.value}
          savedValue={sync.conflict}
        />
        <details className="validation-summary">
          <summary>
            {sync.resource?.validation.length || 0} saved validation errors
            {sync.dirty() ? " · draft changes pending" : ""}
          </summary>
          <ul>
            {sync.resource?.validation.map((e, i) => (
              <li key={i}>
                <button
                  className="text-link"
                  onClick={() => {
                    if (e.nodeId) {
                      setSelected(e.nodeId);
                      void instance?.fitView({
                        nodes: [{ id: e.nodeId }],
                        padding: 0.5,
                        maxZoom: 1,
                      });
                    }
                  }}
                >
                  {e.message}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </footer>
      {addFrom && d?.nodes.some((n) => n.id === addFrom.source) && (
        <AddNodePopover
          from={addFrom}
          allowSwitch={
            d.nodes.find((n) => n.id === addFrom.source)?.type !== "switch"
          }
          onAdd={(type) => add(type, addFrom)}
          onExisting={() => {
            setPendingConnection({
              source: addFrom.source,
              handle: addFrom.handle,
              label: addFrom.label,
            });
            setAddFrom(null);
          }}
          onClose={() => setAddFrom(null)}
        />
      )}
      {editing && d?.nodes.find((n) => n.id === editing) && (
        <NodeEditor
          key={editing}
          node={d.nodes.find((n) => n.id === editing)!}
          onClose={() => setEditing(null)}
          onApply={(n) => {
            update({
              ...d,
              nodes: d.nodes.map((x) => (x.id === n.id ? n : x)),
            });
            setEditing(null);
          }}
          onDelete={() => removeNodes([editing])}
        />
      )}
    </main>
  );
}
