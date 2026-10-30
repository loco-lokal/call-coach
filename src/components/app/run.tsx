"use client";
import { useState } from "react";
import { Button, TextArea } from "../ui";
import { OutcomePicker } from "../forms";
import { CallWorkspace, ConversationCard } from "../conversation";
import { Shell, PageTitle, LeaveGuard } from "./shell";
import { SyncStatus } from "./sync-status";
import { api, json, date, duration } from "../../lib/api";
import {
  advance,
  back,
  canAdvance,
  choose,
  index,
  stateOf,
  type Run,
  type RunState,
} from "../../lib/domain";
import { useDraft } from "../../lib/use-draft";
function Completed({ run }: { run: Run }) {
  const m = index(run.snapshot);
  return (
    <Shell active="runs">
      <PageTitle first="Call" emphasis="review">
        <p>
          {run.scriptName} · {run.outcome === "success" ? "Success" : "Failure"}
        </p>
      </PageTitle>
      <div className="call-metadata">
        <span>Started {date(run.startedAt)}</span>
        <span>Completed {date(run.completedAt)}</span>
        <span>Duration {duration(run.startedAt, run.completedAt)}</span>
      </div>
      <div className="completed-run">
        <CallWorkspace
          title={run.lead.name}
          subtitle={`${run.lead.company} · ${run.lead.phone}`}
          notes={run.callNotes}
          onNotesChange={() => {}}
          onEnd={() => {}}
          readOnly
          controls={
            <span className="subtle">Retained conversation · read-only</span>
          }
          status={<span>Completed call</span>}
        >
          {run.progress.retainedNodeIds.map((id) => {
            const n = m.get(id);
            return n ? (
              <ConversationCard
                key={id}
                node={n}
                selectedOption={run.progress.choices[id]}
                readOnly
              />
            ) : null;
          })}
        </CallWorkspace>
      </div>
      <section className="evaluation-summary">
        <h2>Evaluation</h2>
        <p>{run.outcome === "success" ? "Success" : "Failure"}</p>
        <p className="plain-notes">
          {run.evaluationNotes || "No evaluation notes."}
        </p>
      </section>
      <div className="button-row">
        <a className="button button--secondary" href="/runs">
          Back to history
        </a>
        <a className="button button--ghost" href="/scripts">
          Back to scripts
        </a>
      </div>
    </Shell>
  );
}
export function RunPage({ id }: { id: string }) {
  const sync = useDraft<RunState, Run>({
    key: `run:${id}`,
    mode: "run",
    load: () => api(`/runs/${id}`),
    extract: stateOf,
    save: (value, revision, key) =>
      api(`/runs/${id}/${key ? "complete" : "state"}`, {
        method: key ? "POST" : "PUT",
        body: json({
          ...value,
          expectedRevision: revision,
          ...(key ? { idempotencyKey: key } : {}),
        }),
      }),
  });
  const [error, setError] = useState("");
  const v = sync.value,
    r = sync.resource;
  if (sync.deleted)
    return (
      <Shell active="runs">
        <PageTitle first="Call" emphasis="unavailable" />
        <p role="alert">{sync.message}</p>
        <a href="/runs">Return to history</a>
      </Shell>
    );
  if (r?.phase === "completed") return <Completed run={r} />;
  if (!r || !v)
    return (
      <Shell active="runs">
        <PageTitle first="Open" emphasis="call" />
        {sync.message ? (
          <p role="alert">
            {sync.message} <a href="/runs">Return to history</a>
          </p>
        ) : (
          <p role="status">Restoring the saved call…</p>
        )}
      </Shell>
    );
  const status = (
    <SyncStatus {...sync} localValue={v} savedValue={sync.conflict} />
  );
  if (v.phase === "evaluating")
    return (
      <Shell active="runs">
        <LeaveGuard dirty={sync.dirty} />
        <section className="evaluation-page">
          <PageTitle first="How was" emphasis="the call?" />
          <p>
            {r.lead.name} · {r.scriptName}
          </p>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!v.outcome) {
                setError("Choose Success or Failure to complete the call.");
                return;
              }
              setError("");
              try {
                await sync.complete();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <fieldset
              disabled={sync.pendingCompletion}
              className="evaluation-fields"
            >
              <OutcomePicker
                value={v.outcome}
                onChange={(outcome) => {
                  setError("");
                  sync.change({ ...v, outcome });
                }}
              />
              <TextArea
                label="Evaluation notes (optional)"
                rows={5}
                maxLength={500000}
                value={v.evaluationNotes}
                onChange={(e) =>
                  sync.change({ ...v, evaluationNotes: e.target.value })
                }
              />
            </fieldset>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            <Button
              variant="primary"
              type="submit"
              busy={sync.status === "saving" && sync.pendingCompletion}
              disabled={sync.status === "conflict"}
            >
              {sync.pendingCompletion ? "Retry completion" : "Complete call"}
            </Button>
          </form>
          {status}
        </section>
      </Shell>
    );
  const d = r.snapshot,
    m = index(d),
    g = v.progress.groups[v.progress.activeGroupIndex],
    nodes = [g.firstNodeId, g.secondNodeId]
      .filter(Boolean)
      .map((id) => m.get(id!))
      .filter(Boolean);
  const terminal =
    !canAdvance(d, v.progress) &&
    nodes.every((n) => n!.type !== "switch" || v.progress.choices[n!.id]);
  const change = (progress: RunState["progress"]) =>
    sync.change({ ...v, progress }, true);
  const end = () => sync.change({ ...v, phase: "evaluating" }, true);
  return (
    <Shell active="runs">
      <LeaveGuard dirty={sync.dirty} />
      <div className="active-call-heading">
        <a href="/runs">All runs</a>
        <p>
          {r.scriptName} · Started {date(r.startedAt)}
        </p>
      </div>
      <CallWorkspace
        title={r.lead.name}
        subtitle={`${r.lead.company} · ${r.lead.phone}`}
        notes={v.callNotes}
        onNotesChange={(callNotes) => sync.change({ ...v, callNotes })}
        onEnd={end}
        status={status}
        controls={
          <>
            <Button
              disabled={v.progress.activeGroupIndex === 0}
              onClick={() => change(back(v.progress))}
            >
              Go back
            </Button>
            {canAdvance(d, v.progress) ? (
              <Button
                variant="primary"
                onClick={() => change(advance(d, v.progress))}
              >
                Next
              </Button>
            ) : terminal ? (
              <Button variant="primary" onClick={end}>
                End call
              </Button>
            ) : (
              <span className="control-hint">Choose an option to continue</span>
            )}
          </>
        }
      >
        {nodes.map((n) => (
          <ConversationCard
            key={n!.id}
            node={n!}
            selectedOption={v.progress.choices[n!.id]}
            onSelect={(option) => change(choose(d, v.progress, n!.id, option))}
          />
        ))}
      </CallWorkspace>
    </Shell>
  );
}
