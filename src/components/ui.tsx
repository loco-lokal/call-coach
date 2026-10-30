"use client";

import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export type IconName =
  | "arrow"
  | "back"
  | "check"
  | "close"
  | "plus"
  | "play"
  | "notes"
  | "branch"
  | "message"
  | "alert"
  | "edit"
  | "trash"
  | "book"
  | "layers"
  | "clock"
  | "chevron";
const paths: Record<IconName, ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </>
  ),
  back: (
    <>
      <path d="M20 12H5m6-6-6 6 6 6" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="m8 5 11 7-11 7Z" />,
  notes: (
    <>
      <path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" />
    </>
  ),
  branch: (
    <>
      <path d="M7 5v10a3 3 0 0 0 3 3h7M7 10h7a3 3 0 0 0 3-3V5" />
      <circle cx="7" cy="4" r="2" />
      <circle cx="17" cy="4" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  message: <path d="M5 4h14v12H9l-4 4Z" />,
  alert: (
    <>
      <path d="m12 3 10 18H2Zm0 6v5m0 3h.01" />
    </>
  ),
  edit: (
    <>
      <path d="m14 5 5 5M4 20l5-1L21 7l-5-5L4 14Z" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />
    </>
  ),
  book: (
    <>
      <path d="M12 6C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 2Zm0 0v15" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
};

export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Button({
  variant = "secondary",
  busy = false,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      className={`button button--${variant} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "red";
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Field({
  label,
  hint,
  error,
  id: providedId,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const autoId = useId();
  const id = providedId ?? autoId;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span className="required-label">Required</span>}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-help` : undefined}
      />
      {(error || hint) && (
        <p id={`${id}-help`} className={error ? "field-error" : "field-hint"}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  id: providedId,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
}) {
  const autoId = useId();
  const id = providedId ?? autoId;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-help` : undefined}
      />
      {hint && (
        <p id={`${id}-help`} className="field-hint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select {...props} id={id}>
        {children}
      </select>
    </div>
  );
}

export type SaveState = "saved" | "saving" | "unsaved" | "error" | "conflict";
const saveLabels: Record<SaveState, string> = {
  saved: "All changes saved",
  saving: "Saving changes…",
  unsaved: "Unsaved changes",
  error: "Changes not saved",
  conflict: "Newer version available",
};
export function SaveStatus({
  state,
  announce = true,
}: {
  state: SaveState;
  announce?: boolean;
}) {
  return (
    <span
      className={`save-status save-status--${state}`}
      role={announce ? "status" : undefined}
    >
      {state === "saving" ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        <Icon
          name={
            state === "saved"
              ? "check"
              : state === "unsaved"
                ? "clock"
                : "alert"
          }
        />
      )}
      {saveLabels[state]}
    </span>
  );
}

export function Alert({
  title,
  children,
  action,
  tone = "warning",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "warning" | "error";
}) {
  return (
    <div className={`alert alert--${tone}`} role="alert">
      <Icon name="alert" />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
      {action && <div className="alert-action">{action}</div>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className = "",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Keep the latest callback without closing/reopening the dialog on each render.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const el = dialog.current;
    if (!el || !open) return;
    const previous = document.activeElement as HTMLElement | null;
    el.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`modal ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close.current();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <Button variant="ghost" aria-label={`Close ${title}`} onClick={onClose}>
          <Icon name="close" />
        </Button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </dialog>
  );
}
