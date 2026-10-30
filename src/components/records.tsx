"use client";

import { Badge, Button, Icon } from "./ui";

export type ScriptRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
  errors: number;
};
export function ScriptTable({
  scripts,
  onEdit,
  onPlay,
  onDelete,
  onDuplicate,
  onRuns,
  sample = true,
}: {
  scripts: ScriptRecord[];
  onEdit: (script: ScriptRecord) => void;
  onPlay: (script: ScriptRecord) => void;
  onDelete: (script: ScriptRecord) => void;
  onDuplicate?: (script: ScriptRecord) => void;
  onRuns?: (script: ScriptRecord) => void;
  sample?: boolean;
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label={sample ? "Sample scripts table" : "Scripts table"}
    >
      <table>
        <caption className="sr-only">
          {sample ? "Sample scripts, with availability and dates" : "Scripts, with availability and dates"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Script</th>
            <th scope="col">Created</th>
            <th scope="col">Updated</th>
            <th scope="col">Last call</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {scripts.map((script) => (
            <tr key={script.id}>
              <th scope="row">
                <button
                  className="text-link script-name"
                  onClick={() => onEdit(script)}
                >
                  {script.name}
                </button>
                <div className="record-state">
                  {script.errors ? (
                    <span className="validation-label">
                      <Icon name="alert" />
                      {script.errors} errors · cannot start a call
                    </span>
                  ) : (
                    <span>Ready for a call</span>
                  )}
                </div>
              </th>
              <td>{script.createdAt}</td>
              <td>{script.updatedAt}</td>
              <td>
                {script.lastExecutedAt ?? (
                  <span aria-label="Never executed">—</span>
                )}
              </td>
              <td>
                <div className="row-actions">
                  {onRuns && <Button variant="ghost" aria-label={`Runs for ${script.name}`} onClick={()=>onRuns(script)}><Icon name="book" /></Button>}
                  {onDuplicate && <Button variant="ghost" aria-label={`Duplicate ${script.name}`} onClick={()=>onDuplicate(script)}><Icon name="layers" /></Button>}
                  <Button
                    variant="ghost"
                    disabled={!!script.errors}
                    aria-label={`Start ${script.name}`}
                    title={
                      script.errors
                        ? "Resolve validation errors before starting a call"
                        : "Start call"
                    }
                    onClick={() => onPlay(script)}
                  >
                    <Icon name="play" />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Edit ${script.name}`}
                    onClick={() => onEdit(script)}
                  >
                    <Icon name="edit" />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Delete ${script.name}`}
                    onClick={() => onDelete(script)}
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type RunRecord = {
  id: string;
  lead: string;
  company: string;
  script: string;
  started: string;
  duration: string | null;
  open: boolean;
};
export function RunTable({
  runs,
  onOpen,
}: {
  runs: RunRecord[];
  onOpen: (run: RunRecord) => void;
}) {
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Sample runs table"
    >
      <table>
        <caption className="sr-only">Sample run history</caption>
        <thead>
          <tr>
            <th scope="col">Lead / script</th>
            <th scope="col">Started</th>
            <th scope="col">Duration</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <th scope="row">
                <span className="script-name">{run.lead}</span>
                <span className="record-state">
                  {run.script} · {run.company}
                </span>
              </th>
              <td>{run.started}</td>
              <td>{run.duration ?? "—"}</td>
              <td>
                <Badge tone={run.open ? "green" : "neutral"}>
                  {run.open ? "Open" : "Closed"}
                </Badge>
              </td>
              <td>
                <Button
                  variant="ghost"
                  aria-label={`${run.open ? "Resume" : "View"} call with ${run.lead}`}
                  onClick={() => onOpen(run)}
                >
                  {run.open ? "Resume" : "View"}
                  <Icon name="arrow" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon name="layers" />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="loading-rows" role="status" aria-label="Loading scripts">
      {[0, 1, 2].map((row) => (
        <div key={row}>
          <span />
          <span />
          <span />
        </div>
      ))}
      <span className="sr-only">Loading scripts…</span>
    </div>
  );
}
