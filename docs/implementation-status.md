# Implementation status

The component library was approved on 29 October 2026. The application now uses it for real authenticated workflows rather than sample persistence.

Implemented:

- Go API and PostgreSQL migration/storage, opaque hashed sessions, password/key authentication, browser Origin checks, login rate limiting, private downloads, health/readiness, and secret-free operation logs.
- Schema-versioned full script replacements, all graph error categories, dirty-write timestamps, optimistic revisions, duplication, soft deletion, and stable history identities.
- Fullscreen pan/zoom canvas with handles, editable successors/options, node movement/deletion, start marking, saved error summary, touch/keyboard alternatives, five-second dirty autosave, failure retention and conflicts.
- Saved-draft tests from a selected/hovered node with error/visited guards, no run records, and no last-execution changes.
- Deterministic two-node grouping and branch correction, shared frontend/backend fixtures, preserved retained futures on backtracking, and pruning after changed choices.
- Lead capture, idempotent creation, frozen snapshots, revisioned live checkpoints, independent notes/runs, IndexedDB recovery, bounded retries, explicit concurrent-writer resolution, recoverable evaluation and atomic idempotent completion.
- Global paginated history, script-identity filters after deletion, immutable completed review, and explicit run deletion.
- Official Go MCP SDK with all five tools, matching five-target executable packaging, schema/OpenAPI contracts, and authenticated private configuration downloads.
- Full-stack Docker Compose, test/CI orchestration, HTTPS proxy overlay, and Helm web/API/migration/PostgreSQL manifests with persistent storage.

Verification results and remaining release-environment limits are recorded in verification.md. Physical devices, vendor-distributed stable browser installations, a production HTTPS domain, and a live Kubernetes cluster require checks in the intended release environment; automated browser engines/emulation and manifest validation cannot substitute for those.
