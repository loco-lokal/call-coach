# Call Coach

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js frontend, Go API, PostgreSQL, Docker Compose and Kubernetes with Helm, as required by spec.md and the implementation request.

## Users

Sales reps following branching scripts during live calls; external agents author scripts through MCP.

## Product Purpose

Keep the relevant talking points in view while a rep listens, chooses a branch, and takes independent notes. Persist and recover calls and retain immutable completed snapshots.

## Operating Context

Desktop is primary. Mobile authoring, calls, notes, history, and documentation must remain usable. The first version has one shared password-protected account.

## Capabilities and Constraints

spec.md is authoritative over Intent.md. Two node types: Talking point and Switch. Question text belongs in Talking points. Connections use canvas handles rather than node-editor dropdowns. Outgoing handles and plus buttons open a small node picker that creates and connects the next node in one step; switch options have separate add actions. Two-node conversation presentation, explicit navigation, graph validation, autosaved drafts, optimistic concurrency, recoverable calls, explicit evaluation, history, and protected MCP downloads. No recording, transcription, CRM, search, or analytics.

## Brand Commitments

Call Coach. Minimal, focused UI with ample reading space and legible text. The current user-pinned direction is the replacement Atuin reference: paper white, violet-black ink, cobalt blue, mint green, mist surfaces, regular-weight grotesque typography, broad panel corners, outlined word emphasis and actions. Manrope is the locally served substitute; no Px Grotesk font files or license were supplied. The user approved this component library on 29 October 2026 and authorized full implementation using it.

Component-review feedback: use larger font sizes throughout, with larger conversation text and more reading space to support focus during calls.

## Evidence on Hand

spec.md contains the product interview decisions, example script, contracts, and acceptance criteria. The repository has no existing interface or brand assets. All gallery records are illustrative sample data.

## Product Principles

- Keep the rep focused on the conversation.
- Never imply unsaved work has reached the server.
- Preserve notes independently of branching decisions.
- Make recovery and concurrency conflicts explicit.

## Accessibility & Inclusion

Keyboard access, visible focus, labeled fields, text alongside state colors, sensible overlay focus, touch alternatives, reduced motion, and responsive layouts are required. UI components must have Playwright coverage.
