"use client";

import { useState, type ReactNode } from "react";
import { Badge, Button, Icon, Modal, TextArea } from "./ui";

export type TextNode = {
  id: string;
  type: "talking_point";
  text: string;
};
export type SwitchNode = {
  id: string;
  type: "switch";
  name: string;
  options: { id: string; label: string }[];
};
export type ConversationNode = TextNode | SwitchNode;

export function ConversationCard({
  node,
  selectedOption,
  onSelect,
  readOnly = false,
}: {
  node: ConversationNode;
  selectedOption?: string;
  onSelect?: (id: string) => void;
  readOnly?: boolean;
}) {
  const title = node.type === "switch" ? "Switch" : "Talking point";
  return (
    <article
      className={`conversation-card conversation-card--${node.type}`}
      aria-label={title}
    >
      <div className="node-label">
        <Icon name={node.type === "switch" ? "branch" : "message"} />
        {title}
      </div>
      {node.type === "switch" ? (
        <>
          <h3>{node.name}</h3>
          {readOnly ? (
            <p className="selected-answer">
              {selectedOption
                ? `Selected: ${node.options.find((o) => o.id === selectedOption)?.label ?? "Unknown option"}`
                : "No option selected"}
            </p>
          ) : (
            <div className="branch-options">
              {node.options.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  aria-pressed={selectedOption === option.id}
                  onClick={() => onSelect?.(option.id)}
                  className={`branch-option ${selectedOption === option.id ? "is-selected" : ""}`}
                >
                  <span>{option.label}</span>
                  <Icon
                    name={selectedOption === option.id ? "check" : "chevron"}
                  />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="node-text">{node.text}</p>
      )}
    </article>
  );
}

export function CallWorkspace({
  title,
  subtitle,
  notes,
  onNotesChange,
  onEnd,
  children,
  controls,
  status,
  sample = false,
  readOnly = false,
}: {
  title: string;
  subtitle: string;
  notes: string;
  onNotesChange: (value: string) => void;
  onEnd: () => void;
  children: ReactNode;
  controls: ReactNode;
  status: ReactNode;
  sample?: boolean;
  readOnly?: boolean;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const notesField = (mobile: boolean) => (
    <TextArea
      label={mobile ? "Call notes" : "Notes"}
      placeholder="Capture what matters…"
      value={notes}
      onChange={(e) => onNotesChange(e.target.value)}
      hint="Your notes stay with the call, whichever path you take."
      rows={8}
      readOnly={readOnly}
    />
  );
  return (
    <div className="call-workspace">
      <header className="call-header">
        <div className="call-person">
          <span className="avatar" aria-hidden="true">
            {title
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
          </span>
          <div>
            <strong>{title}</strong>
            <span>{subtitle}</span>
          </div>
          {sample && <Badge>Sample call</Badge>}
        </div>
        {readOnly ? (
          <Badge>Closed</Badge>
        ) : (
          <Button variant="danger" onClick={onEnd}>
            End call
          </Button>
        )}
      </header>
      <div className="call-body">
        <div className="conversation-area">
          <div className="conversation-stack">{children}</div>
          <div className="conversation-controls">{controls}</div>
        </div>
        <aside className="desktop-notes" aria-label="Call notes panel">
          {notesField(false)}
          <div className="notes-foot">
            <Icon name="notes" />
            <span>Separate from your script</span>
          </div>
        </aside>
      </div>
      <footer className="call-footer">
        {status}
        <Button
          variant="secondary"
          className="mobile-notes-toggle"
          onClick={() => setNotesOpen(true)}
        >
          <Icon name="notes" />
          Open notes
          {notes && (
            <span className="notes-dot" aria-label="Notes contain text" />
          )}
        </Button>
      </footer>
      <Modal
        open={notesOpen}
        title="Notes"
        onClose={() => setNotesOpen(false)}
        className="mobile-notes"
        footer={
          <>
            <span className="subtle">
              Notes stay here as you move through the call.
            </span>
            {!readOnly && (
              <Button
                variant="danger"
                onClick={() => {
                  setNotesOpen(false);
                  onEnd();
                }}
              >
                End call
              </Button>
            )}
          </>
        }
      >
        {notesField(true)}
      </Modal>
    </div>
  );
}
