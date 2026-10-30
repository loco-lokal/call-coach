"use client";
import { createId } from "../../lib/id";
import { useEffect, useState, useRef } from "react";
import { LeadForm, type Lead } from "../forms";
import { Button, Modal } from "../ui";
import { Shell, PageTitle } from "./shell";
import { api, APIError, json } from "../../lib/api";
import { local } from "../../lib/local";
import type { Run, Script } from "../../lib/domain";
type Request = {
  scriptId: string;
  expectedScriptRevision: number;
  lead: Lead;
  clientRequestId: string;
};
export function LeadCapture({ id }: { id: string }) {
  const [script, setScript] = useState<Script | null>(null);
  const [latest, setLatest] = useState<Script | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const pendingMemory = useRef<Request | null>(null);
  useEffect(() => {
    api<Script>(`/scripts/${id}`)
      .then(setScript)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <Shell active="scripts">
      <section className="lead-page">
        <a href={`/scripts/${id}`}>Back to script</a>
        <PageTitle first="Before" emphasis="you call">
          <p>{script?.name || "Loading script…"}</p>
        </PageTitle>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        {warning && <p role="alert">{warning}</p>}
        {script && !script.runnable ? (
          <p role="alert">
            Resolve this script’s validation errors before starting a call.{" "}
            <a href={`/scripts/${id}`}>Open editor</a>
          </p>
        ) : (
          script && (
            <LeadForm
              onSubmit={async (lead) => {
                setError("");
                const body: Request = {
                  scriptId: id,
                  expectedScriptRevision: script.revision,
                  lead,
                  clientRequestId: createId(),
                };
                const key = `create:${id}`;
                if (
                  pendingMemory.current?.expectedScriptRevision ===
                    body.expectedScriptRevision &&
                  json(pendingMemory.current.lead) === json(lead)
                )
                  body.clientRequestId = pendingMemory.current.clientRequestId;
                pendingMemory.current = body;
                try {
                  const pending = await local.get<Request>(key);
                  if (
                    pending &&
                    pending.value.expectedScriptRevision ===
                      body.expectedScriptRevision &&
                    json(pending.value.lead) === json(lead)
                  )
                    body.clientRequestId = pending.value.clientRequestId;
                  await local.put(key, {
                    baseRevision: script.revision,
                    value: body,
                  });
                } catch {
                  setWarning(
                    "Local recovery storage is unavailable. Keep this page open when retrying this request.",
                  );
                }
                try {
                  const run = await api<Run>("/runs", {
                    method: "POST",
                    body: json(body),
                  });
                  try {
                    await local.remove(key);
                  } catch {}
                  location.assign(`/runs/${run.id}`);
                } catch (e) {
                  if (e instanceof APIError && e.code === "REVISION_CONFLICT") {
                    setLatest(await api<Script>(`/scripts/${id}`));
                    setError(
                      "The script changed. Review the updated version before starting.",
                    );
                  }
                  throw e;
                }
              }}
            />
          )
        )}
      </section>
      <Modal
        open={!!latest}
        title="This script changed"
        onClose={() => setLatest(null)}
      >
        <p>
          The script is now revision {latest?.revision}. Starting a call will
          use its updated definition. Review it or explicitly choose the updated
          version.
        </p>
        <p>{latest?.validation.length || 0} validation errors.</p>
        <div className="button-row dialog-actions">
          <a href={`/scripts/${id}`}>Review updated script</a>
          <Button
            onClick={() => {
              setScript(latest);
              setLatest(null);
              setError("");
            }}
          >
            Use updated script
          </Button>
        </div>
      </Modal>
    </Shell>
  );
}
