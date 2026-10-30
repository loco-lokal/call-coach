"use client";
import { useEffect, useState } from "react";
import { Button, Modal } from "../ui";
import { BrandWordmark } from "../brand";
import { api } from "../../lib/api";
export function Shell({
  active,
  children,
}: {
  active: "scripts" | "runs" | "docs";
  children: React.ReactNode;
}) {
  const [error, setError] = useState("");
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <a className="wordmark" href="/scripts">
          <BrandWordmark />
        </a>
        <nav aria-label="Main navigation">
          {(
            [
              ["scripts", "Scripts"],
              ["runs", "Runs"],
              ["docs", "Documentation"],
            ] as const
          ).map(([id, label]) => (
            <a
              key={id}
              href={`/${id}`}
              aria-current={active === id ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <Button
          variant="ghost"
          onClick={() => {
            const action = async () => {
              try {
                await api("/auth/logout", { method: "POST" });
                window.dispatchEvent(new Event("call-coach-confirm-leave"));
                window.location.assign("/login");
              } catch (e) {
                setError((e as Error).message);
              }
            };
            const event = new CustomEvent("call-coach-route-action", {
              cancelable: true,
              detail: action,
            });
            if (window.dispatchEvent(event)) void action();
          }}
        >
          Logout
        </Button>
      </header>
      {error && (
        <p role="alert" className="app-error">
          {error}
        </p>
      )}
      <main id="main" className="app-main">
        {children}
      </main>
    </>
  );
}
export function PageTitle({
  first,
  emphasis,
  children,
}: {
  first: string;
  emphasis: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="app-title">
      <h1>
        {first} <span className="word-outline">{emphasis}</span>
      </h1>
      {children}
    </div>
  );
}
export function LeaveGuard({ dirty }: { dirty: () => boolean }) {
  const [action, setAction] = useState<null | (() => void)>(null);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a");
      if (
        a &&
        a.target !== "_blank" &&
        !a.hasAttribute("download") &&
        a.origin === location.origin &&
        !a.hash &&
        a.href !== location.href &&
        dirty()
      ) {
        e.preventDefault();
        setAction(() => () => window.location.assign(a.href));
      }
    };
    const navigate = (e: Event) => {
      if (dirty()) {
        e.preventDefault();
        setAction(() => (e as CustomEvent<() => void>).detail);
      }
    };
    document.addEventListener("click", click, true);
    window.addEventListener("call-coach-route-action", navigate);
    return () => {
      document.removeEventListener("click", click, true);
      window.removeEventListener("call-coach-route-action", navigate);
    };
  }, [dirty]);
  return (
    <Modal
      open={!!action}
      title="Changes are still pending"
      onClose={() => setAction(null)}
    >
      <p>
        Your draft is retained on this device when local recovery storage is
        available. Keep this page open to wait for the server, or leave and
        recover it later.
      </p>
      <div className="button-row dialog-actions">
        <Button onClick={() => setAction(null)}>Stay here</Button>
        <Button
          onClick={() => {
            window.dispatchEvent(new Event("call-coach-confirm-leave"));
            action?.();
          }}
        >
          Leave page
        </Button>
      </div>
    </Modal>
  );
}
