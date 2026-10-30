"use client";
import { useEffect, useState } from "react";
import { Button, Badge, Icon, Modal, Select } from "../ui";
import { EmptyState, LoadingRows } from "../records";
import { Shell, PageTitle } from "./shell";
import { Pagination } from "./scripts";
import { api, date, duration } from "../../lib/api";
import type { Run } from "../../lib/domain";
export function History() {
  const [data, setData] = useState<{ items: Run[]; total: number } | null>(
    null,
  );
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setFilter(new URLSearchParams(location.search).get("scriptId") || "");
    api<{ items: { id: string; name: string }[] }>("/run-script-options")
      .then((v) => setOptions(v.items))
      .catch((e) => setError(e.message));
  }, [reload]);
  useEffect(() => {
    let active = true;
    api<{ items: Run[]; total: number }>(
      `/runs?scriptId=${encodeURIComponent(filter)}&page=${page}`,
    )
      .then((v) => {
        if (active) {
          setData(v);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [filter, page, reload]);
  return (
    <Shell active="runs">
      <PageTitle first="Your" emphasis="runs">
        <p>Resume an open call or revisit a completed conversation.</p>
      </PageTitle>
      <div className="app-toolbar">
        <Select
          label="Filter by script"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
            history.replaceState(
              null,
              "",
              e.target.value ? `/runs?scriptId=${e.target.value}` : "/runs",
            );
          }}
        >
          <option value="">All scripts</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {options.filter((x) => x.name === o.name).length > 1
                ? ` · ${o.id.slice(0, 8)}`
                : ""}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <p role="alert" className="app-error">
          {error}
          <Button onClick={() => setReload((x) => x + 1)}>Retry</Button>
        </p>
      )}
      {!data && !error ? (
        <LoadingRows />
      ) : data?.items.length ? (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Run history"
          >
            <table>
              <caption className="sr-only">Run history</caption>
              <thead>
                <tr>
                  <th>Lead / script</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <th scope="row">
                      <span className="script-name">{r.lead.name}</span>
                      <span className="record-state">
                        {r.scriptName} · {r.lead.company}
                      </span>
                    </th>
                    <td>{date(r.startedAt)}</td>
                    <td>{duration(r.startedAt, r.completedAt)}</td>
                    <td>
                      <Badge
                        tone={r.phase === "completed" ? "neutral" : "green"}
                      >
                        {r.phase === "completed" ? "Closed" : "Open"}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <a
                          className="button button--ghost"
                          href={`/runs/${r.id}`}
                        >
                          {r.phase === "completed" ? "View" : "Resume"}
                          <Icon name="arrow" />
                        </a>
                        <Button
                          variant="ghost"
                          aria-label={`Delete call with ${r.lead.name}`}
                          onClick={() => setDeleting(r)}
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
          <Pagination page={page} total={data.total} onChange={setPage} />
        </>
      ) : (
        data && (
          <EmptyState title="No calls here yet">
            Calls appear here after lead details are submitted. Open calls stay
            available until completed or deleted.
          </EmptyState>
        )
      )}
      <Modal
        open={!!deleting}
        title="Delete this run?"
        onClose={() => !busy && setDeleting(null)}
      >
        <p>
          Delete the call with {deleting?.lead.name}? This removes its notes and
          conversation from history and prevents recovery. Other runs and the
          script remain unchanged.
        </p>
        <div className="button-row dialog-actions">
          <Button disabled={busy} onClick={() => setDeleting(null)}>
            Keep run
          </Button>
          <Button
            variant="danger"
            busy={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api(`/runs/${deleting!.id}`, { method: "DELETE" });
                setDeleting(null);
                setReload((n) => n + 1);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete run
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
