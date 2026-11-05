# Call Coach

A self-hosted workspace for authoring branching sales scripts, testing them, and following them during calls. The approved component library supplies the application’s light paper/cobalt/green design and spacious conversation typography.

The system uses Next.js, a Go API, and PostgreSQL. The API owns graph validation, optimistic revisions, frozen run snapshots, idempotency, and opaque browser sessions. A downloadable SDK-based Go MCP server lets agents list, read, create, and replace script definitions.

## Run locally

Requires Docker Engine and Docker Compose v2. Copy `.env.example` to `.env` and replace the three placeholder secrets with independent random values. The shared password must be 12–72 bytes; the API key must be at least 32 bytes. Use URL-safe database-password characters or percent-encode the password in the database URL when configuring an external deployment.

```sh
cp .env.example .env
# Edit .env before starting.
docker compose up --build --wait web
```

Open [Call Coach](http://127.0.0.1:3000). Sign in with `CALL_COACH_PASSWORD` from `.env`. There is no signup or individual account. PostgreSQL is persisted in a named volume; only the web port is published, on loopback. Migrations complete before the API starts, and web readiness checks the API/database.

For this development workspace, `.env` may already exist with generated local credentials. It is private, ignored by Git, and excluded from Docker build contexts. Do not replace an existing production environment file with the example.

The component gallery remains available at `/components` only when `COMPONENT_PREVIEW=true`, and now requires the same login. `/scripts`, `/runs`, and `/docs` are the real application screens.

## Workflows

- Use Talking points for spoken text, including questions, and Switches for branching. Click an outgoing + handle to add and connect the next node. Each switch option has its own + handle. Existing paths are retained through inserted nodes. To connect existing nodes, drag the same + handle to an incoming handle or use the popover’s Connect to existing node action, then tap/activate an incoming handle. Node editors contain no connection dropdowns.
- Create a script, add nodes and connections, mark a start, and review saved validation errors. Layout/name/graph changes save every five seconds when dirty. Save now and the node’s Test from here action flush the latest draft.
- Test from any selected/hovered node. Invalid drafts are allowed; a test stops at an encountered error and never creates a run or changes last execution.
- Start a normal call with lead name, company, and phone. The current valid revision is frozen. Follow two-node groups, choose branches, go back, and keep independent notes.
- Navigation writes promptly; note/evaluation edits save after one second. Pending changes are first written to IndexedDB. Recovery and competing revisions are explicit.
- End call opens evaluation. Choose Success or Failure, optionally add evaluation notes, and complete. Completed runs are immutable. Global history includes interrupted calls and survives source deletion.
- Documentation explains the graph/schema/API, downloadable MCP executables/configuration, and credential rotation. Config downloads contain the deployment API key and are protected/no-store.

## Verify with Docker Compose

```sh
./scripts/test-compose.sh
```

The same command runs in CI. It creates disposable random credentials and an isolated `call-coach-ci` Compose project, builds release images and five MCP targets, runs Go domain/PostgreSQL/MCP integration tests with the race detector, runs shared TypeScript conversation fixtures and Playwright across five browser/device projects, replaces API/web containers, and verifies a PostgreSQL backup in a separate restored database. Its trap removes only that disposable test project and its volumes. Port 3001 must be free. It never uses the application’s normal database volume.

Reports and traces are under `playwright-report/`. These artifacts contain synthetic test data and may include disposable test credentials; keep access restricted. Test fixtures and all UI assertions are in `tests/`; Go tests are alongside the backend. Browser emulation is not physical-device or vendor stable-browser certification.

For frontend/domain checks with installed Node dependencies:

```sh
npm ci
npm run typecheck
npm run test:domain
```

For backend checks, run `go test ./...` in `backend/`; set `TEST_DATABASE_URL` to enable the real database integration test, and `MCP_BINARY` to a locally built `cmd/mcp` executable to include SDK negotiation/tool calls. Compose sets both automatically.

## Deployment and contracts

- [Deployment, HTTPS, Helm, credentials, backup/restore](docs/deployment.md)
- [Build specification and acceptance contract](spec.md) — supersedes conflicting original Intent.md requirements.
- [JSON Schema](backend/contract/script-schema.json)
- [OpenAPI 3.1 contract](backend/contract/openapi.json)
- [Implementation status and verification](docs/implementation-status.md)
- [Approved design system](DESIGN.md)
- [Public landing page](landing-page/README.md) — separate static site with its own Dockerfile.

Production deployments require HTTPS and matching `PUBLIC_APP_URL`/secure cookies. API and database services stay private. Credentials are deployment configuration and are never public frontend environment variables.
