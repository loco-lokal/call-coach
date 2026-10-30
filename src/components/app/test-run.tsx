"use client";
import { useState } from "react";
import { Button, Alert } from "../ui";
import { ConversationCard } from "../conversation";
import {
  advance,
  back,
  canAdvance,
  choose,
  initial,
  index,
  type Script,
} from "../../lib/domain";
export function TestRun({
  script,
  start,
  onClose,
}: {
  script: Script;
  start: string;
  onClose: () => void;
}) {
  const [p, setP] = useState(() => initial(script.definition, start));
  const d = script.definition,
    m = index(d),
    g = p.groups[p.activeGroupIndex];
  const ids = [g.firstNodeId, g.secondNodeId].filter(Boolean) as string[];
  const duplicated =
    p.retainedNodeIds.length !== new Set(p.retainedNodeIds).size;
  let blocked = duplicated;
  return (
    <section className="test-run" aria-label="Script test">
      <header className="test-header">
        <div>
          <h1>Test conversation</h1>
          <p>Saved revision {script.revision} · no call record or notes</p>
        </div>
        <Button onClick={onClose}>Close test</Button>
      </header>
      <div className="test-conversation">
        {duplicated ? (
          <Alert tone="error" title="This path revisits a node">
            Testing stopped to prevent a cycle. Return to the editor and remove
            the loop.
          </Alert>
        ) : (
          ids.map((id) => {
            if (blocked) return null;
            const n = m.get(id);
            const issues = script.validation.filter((e) => e.nodeId === id);
            if (!n || issues.length) {
              blocked = true;
              return (
                <Alert
                  key={id}
                  tone="error"
                  title={
                    n
                      ? "Testing stops at this node"
                      : "This node is unavailable"
                  }
                >
                  {issues.map((e) => (
                    <p key={`${e.code}-${e.optionId}`}>{e.message}</p>
                  ))}
                </Alert>
              );
            }
            return (
              <ConversationCard
                key={id}
                node={n}
                selectedOption={p.choices[id]}
                onSelect={(option) => setP(choose(d, p, id, option))}
              />
            );
          })
        )}
        <div className="conversation-controls">
          <Button
            disabled={p.activeGroupIndex === 0}
            onClick={() => setP(back(p))}
          >
            Go back
          </Button>
          {!blocked && canAdvance(d, p) ? (
            <Button variant="primary" onClick={() => setP(advance(d, p))}>
              Next
            </Button>
          ) : !blocked &&
            ids.every((id) => m.get(id)?.type !== "switch" || p.choices[id]) ? (
            <p role="status">
              End of test. Return to the editor when you’re ready.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
