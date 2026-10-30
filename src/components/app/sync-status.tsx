"use client";
import { Button, SaveStatus, type SaveState } from "../ui";
export function SyncStatus({
  status,
  message,
  localWarning,
  conflict,
  resolve,
  retry,
  localValue,
  savedValue,
}: {
  status: SaveState;
  message: string;
  localWarning: string;
  conflict: { revision: number } | null;
  resolve: (local: boolean) => Promise<void>;
  retry: () => void;
  localValue?: unknown;
  savedValue?: unknown;
}) {
  return (
    <div className="sync-status">
      <SaveStatus state={status} />
      {localWarning && (
        <p role="alert" className="field-error">
          {localWarning}
        </p>
      )}
      {message && <p role="alert">{message}</p>}
      {status === "error" && (
        <div className="button-row">
          <Button onClick={retry}>Retry</Button>
          <a
            href={`/login?next=${encodeURIComponent(typeof location === "undefined" ? "/scripts" : location.pathname)}`}
          >
            Sign in again
          </a>
        </div>
      )}
      {conflict && (
        <section
          aria-label="Review conflicting versions"
          className="conflict-review"
        >
          <p>
            A saved version (revision {conflict.revision}) is available. Your
            local draft is retained.
          </p>
          <div className="conflict-columns">
            <details>
              <summary>Saved version</summary>
              <pre tabIndex={0} aria-label="Saved version JSON">
                {JSON.stringify(savedValue ?? conflict, null, 2)}
              </pre>
            </details>
            <details>
              <summary>Local draft</summary>
              <pre tabIndex={0} aria-label="Local draft JSON">
                {JSON.stringify(localValue, null, 2)}
              </pre>
            </details>
          </div>
          <div className="button-row">
            <Button onClick={() => void resolve(false)}>
              Load saved version
            </Button>
            <Button variant="primary" onClick={() => void resolve(true)}>
              Apply local draft to latest revision
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
