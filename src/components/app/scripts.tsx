"use client";
import { useEffect, useState } from "react";
import { Button, Field, Icon, Modal, Select } from "../ui";
import {
  EmptyState,
  LoadingRows,
  ScriptTable,
  type ScriptRecord,
} from "../records";
import { Shell, PageTitle } from "./shell";
import { api, date, json } from "../../lib/api";
import { emptyDefinition, type Script } from "../../lib/domain";
export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total} {total === 1 ? "record" : "records"} · Page {page}
      </span>
      <div className="button-row">
        <Button disabled={page === 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button
          disabled={page * 50 >= total}
          onClick={() => onChange(page + 1)}
        >
          Next page
        </Button>
      </div>
    </div>
  );
}
export function Scripts() {
  const [data, setData] = useState<{ items: Script[]; total: number } | null>(
    null,
  );
  const [sort, setSort] = useState("updatedAt-desc");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{
    type: "create" | "duplicate" | "delete";
    script?: ScriptRecord;
  } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  useEffect(() => {
    let active = true;
    const [field, order] = sort.split("-");
    api<{ items: Script[]; total: number }>(
      `/scripts?sort=${field}&order=${order}&page=${page}`,
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
  }, [sort, page, reload]);
  const open = (
    type: "create" | "duplicate" | "delete",
    script?: ScriptRecord,
  ) => {
    setDialog({ type, script });
    setName("");
    setDialogError("");
  };
  return (
    <Shell active="scripts">
      <PageTitle first="Your" emphasis="scripts">
        <p>Build a conversation flow, test it, then make the call.</p>
      </PageTitle>
      <div className="app-toolbar">
        <Button variant="primary" onClick={() => open("create")}>
          <Icon name="plus" className="add-mark" />
          Create script
        </Button>
        <Select
          label="Sort scripts"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="updatedAt-desc">Recently updated</option>
          <option value="updatedAt-asc">Oldest update first</option>
          <option value="name-asc">Name, A–Z</option>
          <option value="name-desc">Name, Z–A</option>
        </Select>
      </div>
      {error && (
        <div role="alert" className="app-error">
          {error}
          <Button onClick={() => setReload((n) => n + 1)}>Retry</Button>
          <a href="/login?next=/scripts">Sign in</a>
        </div>
      )}
      {!data && !error ? (
        <LoadingRows />
      ) : data?.items.length ? (
        <>
          <ScriptTable
            sample={false}
            scripts={data.items.map((s) => ({
              id: s.id,
              name: s.name,
              createdAt: date(s.createdAt),
              updatedAt: date(s.updatedAt),
              lastExecutedAt: s.lastExecutedAt ? date(s.lastExecutedAt) : null,
              errors: s.validation.length,
            }))}
            onEdit={(s) => location.assign(`/scripts/${s.id}`)}
            onPlay={(s) => location.assign(`/scripts/${s.id}/call`)}
            onDelete={(s) => open("delete", s)}
            onDuplicate={(s) => open("duplicate", s)}
            onRuns={(s) => location.assign(`/runs?scriptId=${s.id}`)}
          />
          <Pagination page={page} total={data.total} onChange={setPage} />
        </>
      ) : (
        data && (
          <EmptyState
            title="Your first script starts here"
            action={
              <Button onClick={() => open("create")}>Create script</Button>
            }
          >
            Add talking points, connect a switch, and choose where the
            conversation can go.
          </EmptyState>
        )
      )}
      <Modal
        open={!!dialog}
        title={
          dialog?.type === "delete"
            ? "Delete this script?"
            : dialog?.type === "duplicate"
              ? "Duplicate script"
              : "Create script"
        }
        onClose={() => !busy && setDialog(null)}
      >
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setDialogError("");
            try {
              if (dialog?.type === "delete") {
                await api(`/scripts/${dialog.script!.id}`, {
                  method: "DELETE",
                });
                setDialog(null);
                setReload((n) => n + 1);
              } else {
                const s = await api<Script>(
                  dialog?.type === "duplicate"
                    ? `/scripts/${dialog.script!.id}/duplicate`
                    : "/scripts",
                  {
                    method: "POST",
                    body: json(
                      dialog?.type === "duplicate"
                        ? { name }
                        : { name, definition: emptyDefinition },
                    ),
                  },
                );
                location.assign(`/scripts/${s.id}`);
              }
            } catch (e) {
              setDialogError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {dialog?.type === "delete" ? (
            <p>
              Delete “{dialog.script?.name}”? Existing active and completed runs
              remain available.
            </p>
          ) : (
            <Field
              label="Script name"
              value={name}
              maxLength={200}
              required
              onChange={(e) => setName(e.target.value)}
            />
          )}{" "}
          {dialogError && (
            <p role="alert" className="field-error">
              {dialogError}
            </p>
          )}
          <div className="button-row dialog-actions">
            <Button disabled={busy} onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant={dialog?.type === "delete" ? "danger" : "primary"}
              busy={busy}
            >
              {dialog?.type === "delete"
                ? "Delete script"
                : dialog?.type === "duplicate"
                  ? "Create duplicate"
                  : "Create script"}
            </Button>
          </div>
        </form>
      </Modal>
    </Shell>
  );
}
