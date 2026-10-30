"use client";
import { useState } from "react";
import { Button, Field, Icon } from "../ui";
import { api, json } from "../../lib/api";
import { BrandWordmark } from "../brand";
export function Login() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <main className="login-page">
      <a className="wordmark" href="/login">
        <BrandWordmark />
      </a>
      <section className="login-form">
        <h1>
          Room for <span className="word-outline">conversation</span>.
        </h1>
        <p>Sign in to your shared workspace.</p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/auth/login", {
                method: "POST",
                body: json({ password }),
              });
              const next = new URLSearchParams(location.search).get("next");
              window.location.assign(
                next?.startsWith("/") && !next.startsWith("//")
                  ? next
                  : "/scripts",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" busy={busy}>
            Sign in <Icon name="arrow" />
          </Button>
        </form>
        <p className="subtle">
          Your deployment operator provides the shared password.
        </p>
      </section>
    </main>
  );
}
