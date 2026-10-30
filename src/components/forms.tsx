"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Field, Icon, TextArea } from "./ui";

export type Lead = { name: string; company: string; phone: string };
export function LeadForm({
  onSubmit,
}: {
  onSubmit: (lead: Lead) => void | Promise<void>;
}) {
  const [lead, setLead] = useState<Lead>({ name: "", company: "", phone: "" });
  const [errors, setErrors] = useState<Partial<Lead>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const prefix = useId();
  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = Object.fromEntries(
      Object.entries(lead).map(([key, value]) => [key, value.trim()]),
    ) as Lead;
    const missing = Object.fromEntries(
      Object.entries(trimmed)
        .filter(([, value]) => !value)
        .map(([key]) => [
          key,
          `Enter the lead’s ${key === "phone" ? "phone number" : key}.`,
        ]),
    ) as Partial<Lead>;
    setErrors(missing);
    const first = Object.keys(missing)[0];
    if (first) {
      document.getElementById(`${prefix}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      await onSubmit(trimmed);
    } catch {
      setFailure(
        "Could not start the call. Your details are still here. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form noValidate onSubmit={submit} className="form-stack">
      <Field
        id={`${prefix}-name`}
        label="Lead name"
        autoComplete="name"
        placeholder="e.g. Alex Morgan"
        required
        value={lead.name}
        error={errors.name}
        onChange={(e) => setLead({ ...lead, name: e.target.value })}
      />
      <Field
        id={`${prefix}-company`}
        label="Company"
        autoComplete="organization"
        placeholder="e.g. Northline Studio"
        required
        value={lead.company}
        error={errors.company}
        onChange={(e) => setLead({ ...lead, company: e.target.value })}
      />
      <Field
        id={`${prefix}-phone`}
        label="Phone number"
        type="tel"
        autoComplete="tel"
        placeholder="e.g. +44 20 7946 0100"
        required
        value={lead.phone}
        error={errors.phone}
        hint="Use the number as you normally dial it."
        onChange={(e) => setLead({ ...lead, phone: e.target.value })}
      />
      {failure && (
        <p role="alert" className="field-error">
          {failure}
        </p>
      )}
      <Button variant="primary" type="submit" busy={busy}>
        Start call <Icon name="arrow" />
      </Button>
    </form>
  );
}

export type Outcome = "success" | "failure";
export function OutcomePicker({
  value,
  onChange,
}: {
  value: Outcome | null;
  onChange: (value: Outcome) => void;
}) {
  return (
    <fieldset className="outcome">
      <legend>
        Call outcome <span className="required-label">Required</span>
      </legend>
      <div className="outcome-options">
        {(["success", "failure"] as const).map((outcome) => (
          <label
            key={outcome}
            className={value === outcome ? "is-selected" : ""}
          >
            <input
              type="radio"
              name="outcome"
              value={outcome}
              checked={value === outcome}
              onChange={() => onChange(outcome)}
            />
            <span>{outcome === "success" ? "Success" : "Failure"}</span>
            {value === outcome && <Icon name="check" />}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function EvaluationForm({
  onSubmit,
  submitLabel = "Complete call",
}: {
  onSubmit: (value: {
    outcome: Outcome;
    notes: string;
  }) => void | Promise<void>;
  submitLabel?: string;
}) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!outcome) {
          setError("Choose Success or Failure to complete the call.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onSubmit({ outcome, notes });
        } catch {
          setError(
            "Could not complete the call. Your evaluation is still here. Try again.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <OutcomePicker
        value={outcome}
        onChange={(value) => {
          setOutcome(value);
          setError("");
        }}
      />
      <TextArea
        label="Evaluation notes (optional)"
        placeholder="What went well? What would you change?"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
      />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" busy={busy}>
        {submitLabel}
        <Icon name="check" />
      </Button>
    </form>
  );
}
