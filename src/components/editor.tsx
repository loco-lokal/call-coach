"use client";

import { Badge, Button, Icon, type IconName } from "./ui";

export type EditorNodeProps = {
  type: "talking_point" | "switch";
  text: string;
  start?: boolean;
  error?: string;
  options?: string[];
  onEdit: () => void;
  onPlay: () => void;
  selected?: boolean;
  onSelect?: () => void;
};

export function EditorNode({
  type,
  text,
  start,
  error,
  options,
  onEdit,
  onPlay,
  selected,
  onSelect,
}: EditorNodeProps) {
  const label = type === "switch" ? "Switch" : "Talking point";
  const icon: IconName = type === "switch" ? "branch" : "message";
  return (
    <div className={`editor-node-wrap ${selected ? "is-selected" : ""}`}>
      <Button
        className="node-test"
        onClick={onPlay}
        aria-label={`Test ${label.toLowerCase()}`}
      >
        <Icon name="play" />
        Test from here
      </Button>
      <article
        className={`editor-node ${error ? "has-error" : ""}`}
        aria-label={`${label} editor node`}
        tabIndex={0}
        onClick={onSelect}
        onDoubleClick={onEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEdit();
          }
        }}
      >
        <div className="editor-node-heading">
          <span className="node-label">
            <Icon name={icon} />
            {label}
          </span>
          {start && <Badge tone="green">Start</Badge>}
        </div>
        <p>{text}</p>
        {options && (
          <ul className="editor-options">
            {options.map((option, i) => (
              <li key={`${option}-${i}`}>
                <span>{option}</span>
                <span className="connection-port" aria-hidden="true" />
              </li>
            ))}
          </ul>
        )}
        {error && (
          <div className="node-error">
            <Icon name="alert" />
            {error}
          </div>
        )}
        <div className="editor-node-footer">
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${label.toLowerCase()}`}
          >
            <Icon name="edit" />
            Edit
          </Button>
          {!options && <span className="connection-port" aria-hidden="true" />}
        </div>
      </article>
    </div>
  );
}
