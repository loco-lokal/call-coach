# Call Coach — Build Specification

Status: Ready for implementation, subject to the explicitly listed implementation defaults below.

This specification combines Intent.md with the product interview. Later interview decisions take precedence. In particular, approval has been removed, active calls are persisted continuously, and editor tests may traverse saved invalid drafts until reaching an error. Intent.md remains the original product brief and may contain superseded requirements.

## 1. Product and scope

Handle-add amendment (30 October 2026): outgoing handles are plus buttons that open a small popover to choose the next node. Create and connect the node as one draft change; existing successors remain reachable through the inserted node. Switch options each expose this action. Dragging the same buttons connects to existing nodes without opening the popover. Retain drag linking and an explicit Connect to existing node action; respect the no-consecutive-Switch rule.

User amendment (30 October 2026): use only Talking point and Switch node types. Existing Question nodes are read as Talking points while preserving their content and links. Remove connection dropdowns; use canvas handles for mouse, touch and keyboard linking. This amendment supersedes earlier Question-node and destination-selector requirements.

Call Coach is a self-hosted web application for following branching sales scripts during live calls. A rep creates scripts in a visual workflow editor or asks an external LLM agent to create them through a downloadable MCP server. The rep reviews or edits the script in the web app, starts a call, follows the relevant talking points, selects branches, and takes notes.

The first version uses one shared, password-protected account. It has no individual rep identities, team permissions, or approval workflow.

The system must provide:

- A script library with creation, editing, duplication, deletion, and sorting.
- A fullscreen visual workflow editor with autosave and graph validation.
- A two-node call interface, branching, backward navigation, independent notes, and early call termination.
- Persisted, recoverable, independent active calls and immutable completed calls.
- A global run history that survives source-script deletion.
- A password-protected documentation page with MCP server and configuration downloads.
- API-key-authenticated script creation, viewing, and full-definition editing by agents.
- Next.js frontend, Go backend, PostgreSQL storage, Docker images, and Docker Compose deployment.

Automatic audio recording, transcription, telephony, structured question-answer capture, CRM integration, script approval, script-library search, and analytics dashboards are outside the first version.

## 2. Implementation defaults and requirement precedence

Confirmed product behavior is specified throughout this document. Where the interview did not prescribe a technical choice, the contracts below select implementation defaults rather than introducing unresolved blockers. The following summarizes the main defaults; they are not additional user interview answers:

| Area | Default |
| --- | --- |
| Script format | Versioned JSON definition, with a JSON Schema shared in documentation and MCP tools. |
| API | JSON REST endpoints under /api/v1; Go owns domain validation and persistence. |
| Identifiers and time | UUIDs for server records; stable string IDs for script nodes/options; server timestamps in UTC, displayed in browser-local time. |
| Script start | Exactly one marked starting node is required for a normal call. |
| Linear nodes | Talking points have zero or one successor. |
| Text | Plain text, preserving newlines; no HTML execution or rich-text editor. |
| Normal run creation | Submit lead details, atomically validate the current script revision and capture its snapshot, then open the call UI. |
| Run synchronization | Save navigation changes immediately; debounce note/evaluation edits by one second, flushing pending changes at completion. |
| Browser recovery | IndexedDB stores pending run changes and recoverable editor drafts, scoped by record ID. PostgreSQL holds acknowledged run state. |
| Simultaneous editing | Optimistic revisions prevent silent overwrites. Independent run IDs allow multiple calls; the same run does not silently accept competing writes. |
| MCP | A downloadable Go executable using stdio, calling the Go HTTP API with a configured API key. |
| Browser sessions | Server-managed opaque sessions with a 24-hour absolute lifetime; explicit logout. |
| Deployment | One public web origin; browser API traffic is proxied to Go. PostgreSQL is private to the deployment. |
| History ordering | Started date descending, with a script-identity dropdown filter. |
| Completion | Outcome must be explicitly selected; no default success/failure selection. |

User changes to these defaults should update this document and the affected contracts before implementation.

## 3. Domain model

### 3.1 Script

A script contains:

| Field | Meaning |
| --- | --- |
| id | Stable identity, independent of name. |
| name | Required display name. Names need not be globally unique. |
| definition | Versioned JSON graph and editor layout. |
| revision | Increasing integer for optimistic concurrency. |
| validation | Structured graph errors for the saved definition. |
| createdAt | Creation timestamp. |
| updatedAt | Last persisted name, graph, or layout change; unchanged autosave ticks do not modify it. |
| lastExecutedAt | Most recent normal run creation time; null if never executed. Tests do not update it. |
| deletedAt | Internal soft-deletion timestamp; deleted scripts are absent from the library and cannot start new calls. |

A script with validation errors is still saved but cannot start a normal call.

Duplicating a script requires entering a name. The duplicate receives a new script ID, fresh timestamps, revision 1, no run history, and no last-execution date. Its graph, stable node/option IDs, start markings, canvas positions, and validation state are copied. Node IDs are scoped to the script definition, so copying them does not link the scripts.

Deleting a script must preserve every associated active and completed run. Existing calls can continue using their snapshots. Soft deletion is the implementation default; normal script APIs treat the script as unavailable afterward.

### 3.2 Node types

| Type | Editable content | Outgoing connections | Run behavior |
| --- | --- | --- | --- |
| Talking point | Text only. | Zero or one successor. | Display text; advance using Next when appropriate. |
| Switch | Name and ordered options; each option has an editable label. | At least two options, each linked to a destination. | Rep selects an option to determine the path. |

Questions are written as Talking point text, without a dedicated node type or answer fields. Reps record answers in call notes when needed.

All nodes can be marked as a conversation start. Exactly one such marking is permitted in a runnable definition. No separate Start or End node type exists.

Double-clicking a node opens its content editor. For a Switch, reps edit its name and add, remove, or relabel options. Connections are made through the canvas. Removing an option removes its outgoing connection. Node/option IDs remain stable when labels change.

### 3.3 Run

A normal run is a persisted call record created after lead details are submitted. It includes:

- Run ID and increasing revision.
- Source script identity and source script revision.
- Script name and complete definition snapshot captured at run creation.
- Lead name, company, and phone number.
- Current displayed group and position in navigation history.
- Retained ordered conversation path and selected Switch options.
- Call notes, independent of the script path.
- Lifecycle phase, start time, and completion time.
- Success/failure outcome and optional evaluation notes.

The run's snapshot must be independent of mutable script records. Changes to the source script, including deletion, never change an active or completed run.

Only unfinished runs accept updates. Completed runs are immutable and can only be viewed or deleted.

### 3.4 Run lifecycle

| Phase | History flag | Behavior |
| --- | --- | --- |
| in_progress | Open | Call interface, note taking, navigation, branch correction, recovery, End call. |
| evaluating | Open | “How was the call?” form; evaluation draft can be recovered. |
| completed | Closed | Read-only detail view. |
| Deleted record | Absent | No recovery or review; deletion is not completion. |

A closed window or lost connection does not end or complete a call. An interrupted call remains open until recovered and completed using End call, or explicitly deleted from history.

Duration is null for open runs. For completed runs, duration is completedAt minus startedAt, including interruptions. No pause/resume clock is required.

### 3.5 Lead details and notes

Lead name, company, and phone number are required before creating a normal run. Trim surrounding whitespace and reject blank values. Store the phone number as text; do not require an international number format in the first version.

Call notes are a single free-text field. Backtracking or changing branches never clears or rewrites them. Evaluation notes are a separate optional free-text field on the ending screen.

Lead details become fixed after the run starts in the first version. Notes remain editable while the call is in progress. Completed lead details, notes, and evaluation cannot be edited.

## 4. Machine-readable script definition

Use schemaVersion 1. The same format is used by UI writes, API writes, MCP tools, run snapshots, and documented examples.

A valid branching example:

~~~json
{
  "schemaVersion": 1,
  "nodes": [
    {
      "id": "intro",
      "type": "talking_point",
      "isStart": true,
      "text": "Introduce yourself and explain the reason for calling.",
      "next": "interest"
    },
    {
      "id": "interest",
      "type": "switch",
      "isStart": false,
      "name": "Is the lead interested?",
      "options": [
        { "id": "yes", "label": "Interested", "target": "discovery" },
        { "id": "no", "label": "Not interested", "target": "goodbye" }
      ]
    },
    {
      "id": "discovery",
      "type": "talking_point",
      "isStart": false,
      "text": "What is your biggest sales challenge?",
      "next": "goodbye"
    },
    {
      "id": "goodbye",
      "type": "talking_point",
      "isStart": false,
      "text": "Thank the lead for their time.",
      "next": null
    }
  ],
  "layout": {
    "positions": {
      "intro": { "x": 0, "y": 0 },
      "interest": { "x": 320, "y": 0 },
      "discovery": { "x": 640, "y": -120 },
      "goodbye": { "x": 960, "y": 0 }
    }
  }
}
~~~

Contract rules:

- Talking points use text and next. A null next means a terminal node.
- Switch uses name and an ordered options array. Each option has an ID, label, and target node ID.
- While editing, an option target may be null; it is saved as an error and blocks normal runs.
- IDs are nonempty strings, unique among nodes or within their Switch's options respectively.
- isStart is explicit on each node so duplicate start markings can be persisted and diagnosed.
- An empty nodes array is a valid draft representation but cannot be run.
- layout is optional for API/MCP input. Missing positions are generated by the editor without changing graph meaning.
- A full-definition update replaces the entire definition. Omitted nodes/options/connections are removed, rather than merged.
- The schema rejects unsupported schema versions, unknown node types, wrong value types, and oversized payloads before replacing a stored definition.
- Graph problems such as duplicate IDs, dangling references, or cycles are saved with validation errors when the JSON can be interpreted using the schema.
- Name belongs to script metadata, outside the definition; update requests can replace both name and definition.

Publish a machine-readable JSON Schema and use it in API documentation and MCP tool input descriptions.

## 5. Graph validation

Go is authoritative for validation; the frontend may provide immediate feedback but must display the backend's saved results.

Run validation after each persisted definition change and before normal run creation. Store or return enough detail to identify nodes, options, and relevant fields.

| Code | Error condition |
| --- | --- |
| EMPTY_SCRIPT | No nodes. |
| MISSING_START | No node marked as start. |
| MULTIPLE_STARTS | More than one node marked as start. |
| DUPLICATE_NODE_ID | Node IDs are not unique. |
| DUPLICATE_OPTION_ID | Option IDs are not unique within a Switch. |
| EMPTY_TEXT | Talking point has blank text. |
| EMPTY_SWITCH_NAME | Switch name is blank. |
| TOO_FEW_OPTIONS | Switch has fewer than two options. |
| EMPTY_OPTION_LABEL | An option label is blank. |
| MISSING_OPTION_TARGET | An option has no destination. |
| UNKNOWN_TARGET | A connection references a nonexistent node. |
| CONSECUTIVE_SWITCHES | A Switch points directly to another Switch. |
| CYCLE | The graph contains a directed cycle, including a self-loop. |
| UNREACHABLE_NODE | A node is not reachable from the unique start node. |

Multiple incoming connections are valid and permit rejoining branches. A Talking point may have no successor and is then terminal. Branches may share destinations.

When there is no unique start, report the start error first and do not invent an arbitrary start for reachability analysis. Check independent errors as far as possible.

Return errors using a consistent shape:

~~~json
{
  "code": "MISSING_OPTION_TARGET",
  "message": "Connect the Not interested option to a node.",
  "nodeId": "interest",
  "optionId": "no",
  "field": "options.no.target"
}
~~~

Nonapplicable context fields can be omitted. Saving a schema-valid but graph-invalid draft succeeds and includes runnable: false and its errors. Validation errors must not be mistaken for an unsuccessful save.

### Test-run validation exception

A normal call requires the entire script to be valid. An editor test does not:

- Always save first, even when the graph has errors.
- Start at the hovered node, independent of the designated normal start.
- Use saved validation results.
- Stop when an encountered node has an associated error; show that node's error and a close/return control.
- Global errors such as a missing unique start do not prevent a test from starting at an explicitly selected node, unless that node has an associated blocking error.
- When a two-node display would encounter an invalid second node, show the first valid node and an error indication for the second; do not execute the invalid node or traverse beyond it.
- Maintain a visited-node guard so malformed cyclic drafts cannot produce an infinite test.
- Stop at a terminal node without showing the real call-evaluation form.
- Keep a Close test control visible throughout testing, including at end/error states. It returns to the editor with the saved definition and layout intact. Use this control instead of the normal call's End call action.
- Never create or update a run record or change lastExecutedAt.

Saving the definition is persistent; the test session, notes, progress, and selections are not.

## 6. Screens and interaction requirements

### 6.1 Login and navigation

Unauthenticated users see a password-only login screen. Successful login opens the script library or the originally requested protected page.

Provide navigation to Scripts, Runs, Documentation, and Logout. The editor uses the full available viewport; it may replace the normal navigation shell with a compact editor toolbar and return control.

All application pages and data endpoints require authentication except login and non-sensitive health endpoints. Documentation, configuration downloads, and binary downloads are protected.

### 6.2 Script library

Show script name, creation date, last-update date, and last-execution date. Show a clear error indicator for scripts that cannot run.

Provide:

- Create script.
- Edit.
- Play, disabled for invalid scripts with a visible reason.
- View runs, opening the global history filtered to that script ID.
- Duplicate, requesting the new name.
- Delete, with a confirmation stating that existing runs remain available.

Support sorting by name and by last-update date, ascending or descending. Default to most recently updated first. There is no search field.

Never-executed scripts display a neutral empty value for last-execution date.

### 6.3 Fullscreen editor

Use a node-and-connection canvas resembling n8n workflow editing:

- Pan and zoom; fit the flow to the viewport.
- Add either of the two node types.
- Select, move, double-click to edit, and delete nodes.
- Connect successors and Switch-option handles; remove connections.
- Mark/unmark a node as start. Start markings are visually identifiable.
- Add/remove/relabel Switch options and edit the Switch name.
- Display node-associated errors on the canvas and in an error summary.
- Selecting an error focuses the affected node where possible.
- Show saving, saved, unsaved, and retry/error status.
- Hovering a node reveals Play above it.
- Clicking Play waits for the latest definition to be saved before opening the test.

On touch devices, tapping/selecting a node exposes the same Play action because hover is unavailable. Provide a visible Edit action as a touch alternative to double-clicking.

Autosave checks for dirty changes every five seconds. Do not send overlapping script saves or persist an unchanged definition just to advance timestamps. If changes occur during an in-flight save, leave the newer local content dirty for the next save. A test request flushes the latest changes rather than testing the previous autosave.

If saving fails, retain the draft, display a warning, and retry. Never replace newer unsaved content with an older response. Validation errors have a separate visual status from connection/storage failures.

### 6.4 Lead-details screen

Play opens the required name, company, and phone-number form. Submit creates the run; only after successful creation does the call UI open.

Use a client-generated request ID for creation so retrying a request after a lost response does not create duplicate calls. If the script revision changed after opening the form, request confirmation/reload of the updated script instead of silently starting a different flow.

### 6.5 Call screen

Use a minimal, light interface focused on the relevant nodes.

Desktop layout:

- Top bar with End call always visible.
- Conversation area occupies approximately two thirds of the width.
- Notes area occupies approximately one third.
- Conversation nodes are stacked within their area, with controls below them.
- Go back and synchronization status remain readily discoverable.

Mobile layout:

- Nodes are arranged top to bottom and the content scrolls as needed.
- End call remains visible in the top bar.
- Notes open through a toggle as a fullscreen panel, with an obvious close control.
- Opening/closing notes preserves call position and unsaved note content.
- Keep End call accessible from the notes panel as well.

No automatic progression or answer interpretation occurs. The rep decides when to advance and which option matches the lead's response.

### 6.6 Ending screen

End call changes the run to evaluating and opens:

- Heading: How was the call?
- Success/failure toggle with an explicit required choice.
- Optional evaluation-notes text box.
- Submit button.

Call notes already entered remain stored independently. Do not add a separate Save screen.

Clicking Submit shows a loading spinner and prevents overlapping submissions. Successful completion opens the read-only run detail. On failure, retain the outcome and notes, show a warning, and allow retry; do not navigate to a success view.

For simplicity, once End call has moved a run to evaluating, recovery returns to the evaluation form rather than resuming script navigation. The run remains Open until Submit succeeds.

### 6.7 Global run history

One history view contains all runs, including open runs and runs whose scripts were deleted.

Show:

- Script name captured for the run.
- Start date/time.
- Duration for completed calls; an empty value for open calls.
- Open/Closed flag.
- Action to open/resume.
- Delete action with confirmation.

Default ordering is newest start first. Provide a script-name dropdown whose values are script IDs, plus an All scripts option. Populate it from live scripts and retained run history so deleted scripts remain filterable. Use the current name for a live script's dropdown label and the latest stored name for a deleted script; filtering always uses identity.

If names collide, disambiguate labels with a short ID. The history row preserves its snapshot name even if the live script was later renamed. Do not distinguish deleted-source runs using a special badge or separate section.

Selecting an open run restores its stored phase and state. Selecting a completed run opens its detail view.

Deleting a run removes it from history and prevents future recovery. Deleting one run does not modify other runs or the source script.

### 6.8 Completed-run detail

Display the retained conversation path as a scrollable list beside call notes on desktop. Show:

- Source script's snapshot name.
- Lead details.
- Start/completion timestamps and duration.
- Each retained node's text or Switch name.
- Selected option labels for visited Switches.
- Success/failure outcome and optional evaluation notes.

On mobile, use the same stacked content and fullscreen notes-panel behavior where appropriate.

All fields are read-only. Provide return-to-history and return-to-scripts navigation. A run's content does not depend on the source script still existing.

## 7. Conversation state machine

### 7.1 Displayed groups

A group normally contains two nodes. Next advances to the next group, rather than shifting the window by one node.

Let T mean Talking point, and S mean Switch:

| Current display | Controls and transition |
| --- | --- |
| T then T | Next replaces both with the next group after the second node. |
| S with no choice | Show S alone and no Next. Selecting an option reveals its T destination as the second node in the same group. |
| Answered S then T | Next advances after T. If T is terminal, show End call underneath instead. |
| T then unanswered S | No Next. Selecting an option advances directly to a new group beginning at the selected destination. |
| T then answered S after Go back | Show the saved selection. Selecting an option continues; selecting a different option invalidates the subsequent path. |
| One remaining terminal T | Show only T and End call below it. |
| S then S | Invalid graph; normal calls cannot reach this configuration. |

A group containing an unanswered Switch never has Next. A first-position answered Switch can have Next because its second node is known. At a terminal display, End call replaces a meaningless Next action.

End call is also always present in the top bar, including before all visible talking points have been discussed. Reaching a terminal node does not automatically complete a run.

### 7.2 History and backtracking

Persist an ordered list of displayed groups and an active-group index. Each group records its first node and any revealed second node. Persist selected option IDs and the retained ordered node path.

- The first group has no enabled Go back.
- Go back restores the preceding group and its selected options.
- Revealing a second node after a first-position Switch updates the current group; it does not create a separate back-navigation step.
- Continuing along unchanged choices can reuse retained forward groups without duplicating nodes in the stored conversation.
- Simply going back does not discard the retained future path.
- Changing a Switch selection removes all retained nodes, groups, and choices after that Switch, including downstream state after a rejoin, then derives the new path.
- Call notes and lead details are not affected by branch correction.
- No separate Forward control is required; Next or option selection continues the flow.

Record only nodes that were displayed along the retained path, including a revealed second node. Do not append unseen successors. A displayed question does not imply a recorded answer.

If the rep ends while viewing an earlier group without changing a branch, preserve the retained visited path; backtracking alone does not erase the conversation.

### 7.3 Run isolation and validation

All progress operations use the run snapshot, not the live script definition. Validate that supplied node IDs, option IDs, frames, and retained paths are consistent with that snapshot.

For implementation, the frontend can compute immediate display state optimistically, while Go validates complete progress checkpoints before acknowledging them. Keep the transition rules in explicit, deterministic functions and verify frontend/backend parity using shared fixtures.

State includes:

~~~json
{
  "groups": [
    { "firstNodeId": "intro", "secondNodeId": "interest" },
    { "firstNodeId": "discovery", "secondNodeId": "goodbye" }
  ],
  "activeGroupIndex": 1,
  "choices": { "interest": "yes" },
  "retainedNodeIds": ["intro", "interest", "discovery", "goodbye"]
}
~~~

This example is checkpoint state for the sample definition, after choosing Interested. Keep previous choices available for correction without maintaining an audit transcript of discarded paths.

## 8. Persistence, recovery, and failures

### 8.1 Live saving

Create the run before opening the call view. Thereafter:

- Write local pending state before sending an update.
- Send navigation, branch changes, and End call phase changes promptly.
- Debounce call-note/evaluation-text changes by one second.
- Serialize writes per run. Coalesce unsent checkpoints to the newest state; do not reorder an older response over newer edits.
- Keep separate queues for separate runs.
- Acknowledge saved status only after PostgreSQL persistence succeeds.
- Flush the latest call state and evaluation when completing the run.

Do not rely on a tab-close network request as the only way to save state.

### 8.2 Retry and warning behavior

When a script save or run update fails:

- Show a visible warning with an unsaved/retrying status.
- Keep the local draft and allow the rep to continue working during temporary network/server failures.
- Retry transient failures with bounded exponential backoff: 1, 2, 5, 10, then 30 seconds between attempts.
- Retry promptly when connectivity returns, and provide a manual Retry action.
- Authentication failures prompt reauthentication; retain pending work and resume after login.
- Validation/request errors and revision conflicts do not retry forever as though they were network outages.

When a window/tab is closing with unacknowledged changes, request the browser's native unsaved-changes warning. Use an in-app warning for route changes. Browser close prompts are best effort; recovery storage is still required.

If local persistence itself fails, warn explicitly and retain in-memory state. Do not claim recoverability for changes that have not reached either storage location.

### 8.3 Recovery and concurrent writers

An open run can be recovered from global history or its direct URL. Load server state, then reconcile any local pending checkpoint for the same run.

- If the local checkpoint is based on the current server revision, restore it and retry synchronization.
- If the server has advanced independently, do not silently overwrite it. Offer to use saved server state or explicitly apply the local draft against the latest revision.
- Completion/deletion on the server takes precedence over a stale local editable copy. Do not recreate a deleted run through a retry.
- Clear acknowledged local pending data after successful completion or deletion.
- No automatic expiry or auto-completion of interrupted calls is required.
- Multiple runs are independent. Competing tabs editing the same run are protected by revision checks; simultaneous collaborative editing is not required.

Preserve partially entered evaluation values and the evaluating phase during recovery.

### 8.4 Completion and retry

Completion must be atomic: flush the final checkpoint, set outcome/evaluation notes, set completedAt, increment revision, and make the run immutable in one transaction.

Use an idempotency key for completion. Retrying the same request after a lost response returns the original completed result. A different attempt to modify a completed run is rejected. Keep the run open if completion fails before the transaction commits.

## 9. Storage design

Use PostgreSQL migrations checked into the repository. Suggested logical tables:

| Table | Fields and responsibilities |
| --- | --- |
| scripts | UUID ID; name; definition JSONB; revision; validation JSONB; created_at; updated_at; last_executed_at; deleted_at. |
| runs | UUID ID; source_script_id; source_revision; script_name; script_snapshot JSONB; lead fields; phase; progress JSONB; call_notes; outcome; evaluation_notes; started_at; completed_at; updated_at; revision. |
| sessions | Hash of opaque session token; created_at; expires_at. |
| idempotency_keys | Operation scope, request key, request fingerprint, resulting resource/response; support safe retry of creation and completion. |

Database rules:

- An active run's snapshot is fixed after creation.
- A completed run rejects further content updates.
- Source-script deletion must not cascade to runs.
- A deleted run is not resurrected by late updates.
- Outcome is success or failure for completed runs and nullable while open.
- completed_at is present only when completed.
- Durations are derived from timestamps rather than maintained by a browser timer.
- Index script listing by updated_at and name, and run history by started_at and source_script_id.
- Use transactions for script revision updates, run creation with last-execution update, checkpoint revision updates, and completion.
- Use conditional revision updates to prevent lost writes.

Keep the same source script ID in each run even after deletion so dropdown filtering remains stable. Soft-deleted script rows may remain as identity records; snapshots are still the source of historical display content.

## 10. HTTP API contract

All application responses are JSON except downloads and health endpoints. Use the same origin for the browser.

### 10.1 Authentication

Browser endpoints use an HttpOnly session cookie. Agent endpoints accept:

~~~text
Authorization: Bearer <deployment-api-key>
~~~

API-key access is limited to listing, retrieving, creating, and updating scripts. It does not grant run-history access, documentation/config downloads, or deletion privileges in the first version.

Require a valid browser session and matching Origin for browser mutations. Use SameSite cookies, Secure in HTTPS deployments, a host-only cookie, and no cross-origin credential sharing by default.

### 10.2 Endpoints

| Method and path | Access | Purpose |
| --- | --- | --- |
| POST /api/v1/auth/login | Public | Body: password. Create session; rate-limit failed attempts. |
| POST /api/v1/auth/logout | Session | Revoke current session and clear cookie. |
| GET /api/v1/auth/session | Session | Return current authentication status without secrets. |
| GET /api/v1/scripts | Session or key | List nondeleted scripts, metadata, runnable flag, revision, validation summary; sort=name or updatedAt, order=asc or desc. |
| POST /api/v1/scripts | Session or key | Create with name and complete definition, including invalid graph drafts. |
| GET /api/v1/scripts/{id} | Session or key | Return metadata, full definition, revision, and validation. |
| PUT /api/v1/scripts/{id} | Session or key | Replace name/definition with expected revision. |
| POST /api/v1/scripts/{id}/duplicate | Session | Copy with requested name; return new script. |
| DELETE /api/v1/scripts/{id} | Session | Soft-delete without deleting runs. |
| POST /api/v1/runs | Session | Create from scriptId, expectedScriptRevision, lead fields, and clientRequestId; validate current script and capture snapshot. |
| GET /api/v1/runs | Session | Global history; optional scriptId filter; paginated newest-first. |
| GET /api/v1/run-script-options | Session | Script-ID/name options including identities retained only in run history. |
| GET /api/v1/runs/{id} | Session | Return phase, snapshot, progress, notes, lead details, evaluation, timestamps, revision. |
| PUT /api/v1/runs/{id}/state | Session | Replace unfinished progress/notes/evaluation draft with expected revision. |
| POST /api/v1/runs/{id}/complete | Session | Atomically finalize checkpoint, success/failure and optional evaluation notes with expected revision and idempotency key. |
| DELETE /api/v1/runs/{id} | Session | Delete open or completed run; no effect on script or other runs. |
| GET /api/v1/docs/script-schema | Session | Download JSON Schema. |
| GET /api/v1/docs/mcp-config | Session | Download configuration including API key; no-store. |
| GET /api/v1/docs/mcp-downloads/{platform} | Session | Download packaged MCP executable; allowlisted build targets only. |
| GET /healthz | Public | Process health, no secrets. |
| GET /readyz | Public | Readiness including database/migration availability; no connection details. |

The frontend route /docs is password-protected. Its protected APIs must enforce authentication independently of the page.

Use page/pageSize pagination for collection APIs, with a default of 50 and maximum of 100. Script names and sorting are not a search interface. Use stable ID tie-breakers for equal sort values.

### 10.3 Write and error behavior

A successful script write returns its resource, revision, runnable flag, and structured validation errors. Graph-invalid draft creation returns 201; graph-invalid update returns 200. Malformed schema input returns 422 and does not replace the previous record.

Use:

| Status | Meaning |
| --- | --- |
| 400 | Malformed JSON/request syntax. |
| 401 | Missing or invalid authentication. |
| 403 | Credential type not authorized, or invalid browser origin. |
| 404 | Unknown/deleted resource. |
| 409 | Revision conflict, incompatible idempotency reuse, or attempt to edit a completed run. |
| 422 | Invalid request fields/schema or attempted normal call from a graph-invalid script. |
| 429 | Login rate limit. |
| 500/503 | Unexpected server or temporary dependency failure; client retains pending changes. |

Error shape:

~~~json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "This script changed after it was loaded.",
    "currentRevision": 8
  }
}
~~~

Include field errors or graph errors where relevant. Do not include credentials, stack traces, or database connection strings.

Full-definition script update body:

~~~json
{
  "expectedRevision": 7,
  "name": "Discovery call",
  "definition": {
    "schemaVersion": 1,
    "nodes": [],
    "layout": { "positions": {} }
  }
}
~~~

This example intentionally saves an invalid empty draft and must return validation errors rather than a rejected save.

Run state updates accept only editable fields, not a replacement snapshot, start timestamp, source script ID, or completed status. Go verifies that progress is consistent with the frozen graph.

### 10.4 Concurrent editing

Return revision on every resource read/write. Updates require expectedRevision.

On conflict, return the latest revision and require the client/agent to reload before retrying against it. The editor keeps its local draft and shows a conflict message with actions to load the saved version or explicitly replace it with the local version after fetching the latest revision. Do not silently merge two full graphs or continuously overwrite an agent's changes from stale autosave state.

## 11. MCP server and documentation

Implement a small downloadable Go executable that runs locally as the agent client's subprocess and calls the HTTP API. Use an MCP SDK with stdio support; negotiate the protocol through the SDK rather than implementing an ad hoc JSON protocol.

Protocol messages use stdin/stdout and logs use stderr, following the [official MCP stdio transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

Provide these tools:

| Tool | Inputs | Result |
| --- | --- | --- |
| list_scripts | Optional sort/order and pagination. | Script metadata, IDs, revisions, runnable state. |
| get_script | Script ID. | Full current definition, metadata, revision, validation. |
| create_script | Name and complete definition. | Saved resource and validation; invalid drafts are allowed. |
| update_script | Script ID, expected revision, name, complete definition. | Full replacement result or structured conflict/error. |
| get_script_schema | None. | Bundled versioned JSON Schema and graph-rule guidance. |

The schema tool is local metadata and does not grant access to protected application information. Agent writes are subject to the same validation and revision checks as UI writes.

No MCP tools for deleting scripts, starting calls, reading call notes/history, or changing credentials are required.

Downloadable configuration example:

~~~json
{
  "mcpServers": {
    "call-coach": {
      "command": "/absolute/path/to/call-coach-mcp",
      "env": {
        "CALL_COACH_URL": "https://calls.example.com",
        "CALL_COACH_API_KEY": "<actual-deployment-api-key>"
      }
    }
  }
}
~~~

The documentation must explain that the executable path must match the user's installation and show equivalent field mapping for clients that use another configuration wrapper. Do not promise one wrapper works in every MCP client.

Provide builds for macOS and Linux on amd64/arm64, and Windows amd64 as an initial packaging default. Host binaries with the matching application release; expose their downloads only through authenticated handlers. The executable contains no embedded API key.

The documentation page includes:

- What each node type means and all graph constraints.
- Valid JSON examples, the downloadable schema, API auth, and full-replacement semantics.
- How to download the executable and configuration and connect an MCP client.
- How to ask an agent to create/view/edit a script, then review/test it in the UI.
- Validation and revision-conflict examples.
- Password/API-key deployment configuration and how to update credentials by restarting the deployment.
- A clear indication that the downloaded configuration contains the deployment API key.

Return credential-bearing responses with Cache-Control: no-store. Never put the API key in URLs, browser asset bundles, shared caches, or logs.

## 12. Application architecture

Use three deployment services:

1. Next.js web service for the interface and server rendering as needed.
2. Go API service for authentication, scripts, validation, runs, documentation downloads, and persistence.
3. PostgreSQL database with a persistent volume.

Route browser API requests through the public web origin to Go. The API is reachable on the internal Docker network; external agents use the same public origin through their local MCP executable. No separate hosted LLM service or LLM-provider key is required by Call Coach.

Frontend modules:

- Authentication/navigation.
- Script library.
- Workflow canvas and node editors.
- Script draft autosave/validation.
- Shared conversation renderer and transition functions.
- Normal run controller and test-run controller.
- Per-run synchronization/recovery.
- Evaluation, run history, and read-only detail.
- Documentation/download UI.

Backend modules:

- HTTP/auth/session middleware.
- Script repository and graph validator.
- Run repository, checkpoint validation, and completion service.
- History/filter projections.
- Documentation/config/binary handlers.
- Idempotency and concurrency handling.
- Migrations and health/readiness.

Use the same conversation components for real calls and tests; tests omit lead capture, notes, server run creation, and evaluation. Completed review uses the same node presentation styles with controls removed.

Publish an OpenAPI contract and JSON Schema alongside the code. Pin dependency versions and commit lockfiles during implementation; this document does not require specific Next.js, Go, or PostgreSQL release numbers.

## 13. Authentication and deployment configuration

The global password and API key are supplied during deployment/startup, not chosen through signup.

Suggested environment contract:

| Variable | Required | Purpose |
| --- | --- | --- |
| CALL_COACH_PASSWORD | Yes | Shared browser-login password; never returned by APIs. |
| CALL_COACH_API_KEY | Yes | Agent bearer key; downloadable only through authenticated MCP config. |
| DATABASE_URL | Yes | PostgreSQL connection. |
| PUBLIC_APP_URL | Yes | Public origin for links, Origin checks, MCP configuration. |
| INTERNAL_API_URL | Web service | Internal Go address for proxying browser API traffic. |
| COOKIE_SECURE | Deployment-specific | True for HTTPS hosting; false only for explicit local HTTP use. |
| SESSION_TTL_HOURS | No | Defaults to 24. |
| LOG_LEVEL | No | Defaults to info. |

The browser must never receive backend secrets as public frontend environment variables.

Store session-token hashes in PostgreSQL, issue cryptographically random opaque tokens, and invalidate them on logout. Compare credentials using vetted authentication primitives, hash the configured password in memory at startup, and use constant-time comparison for API keys. Do not store the configured password or API key in the application tables.

Credential changes are deployment changes followed by restart. Revoke all active browser sessions after changing the configured password as an operator procedure; old MCP configs stop working after key rotation. No in-app account-management UI is required.

## 14. Docker, operations, and data ownership

Provide:

- Multi-stage production Dockerfiles for the Next.js frontend and Go API.
- A docker-compose.yml with web, api, and PostgreSQL, persistent database storage, health checks, and an example environment file containing placeholders.
- An explicit database migration command/service that completes before application readiness.
- Documentation for building images and running local/test deployments with Docker Compose.
- A documented production setup with an HTTPS reverse proxy and a single public app origin.
- A database backup/restore procedure; both script definitions and run snapshots are retained in PostgreSQL.

Keep PostgreSQL private and expose only the intended web port by default. Secrets must not be baked into images. Store database state outside disposable containers. Redeploying containers or editing scripts must not lose call records.

The deployment operator owns data retention; the first version has manual script/run deletion and no automatic retention expiry. Routine backups can contain records that have been deleted from the live database; operator documentation should explain this.

Log request IDs, operation, status, latency, retry/conflict outcomes, and backend errors. Avoid logging lead details, node text, notes, passwords, keys, session tokens, and downloaded config contents. A warning in the UI must correspond to a meaningful saved/unsaved state rather than a cosmetic timer.

## 15. Responsive behavior and accessibility

Use a minimal light color palette, ample whitespace, legible text, and clear visual hierarchy. Give Talking point and Switch nodes distinct visible labels. Switch options must be easy to distinguish and select.

Desktop is the primary target, but core authoring, normal calls, history, documentation, and notes must remain usable on mobile. Use a responsive breakpoint around 900 CSS pixels for the 2:1 call layout, with stacked presentation below it.

Required interaction quality:

- Keyboard-accessible controls, visible focus, and labeled inputs.
- Outcome toggle with an accessible selected state.
- Option labels exposed to assistive technology.
- Error text and status labels in addition to colors.
- Focus moves sensibly when opening/closing node editors, mobile notes, evaluation, and confirmation dialogs.
- Status announcements for saves, errors, and completion without repeatedly interrupting the rep.
- Canvas zoom/pan support and touch alternatives to hover/double-click.
- Long node text and notes do not push End call out of reach.

Test current stable Chrome/Edge, Firefox, Safari, and mobile Safari/Chrome at implementation time. Mobile notes must preserve content when toggled or rotated.

## 16. Acceptance tests and verification

Use meaningful tests for domain behavior and failure paths, not visual snapshots of every implementation detail.

### 16.1 Script and editor

- Create, rename, autosave, reload, duplicate, and delete a script.
- Save an incomplete/invalid graph and see its validation errors after reload.
- Validate missing/duplicate starts, unreachable nodes, cycles, consecutive Switches, dangling targets, incomplete options, and empty content.
- Accept branch merges and terminal text nodes.
- Keep normal Play blocked for invalid drafts, including direct API attempts.
- Save immediately before testing rather than using a stale five-second autosave.
- Start a test from a hovered/selected node, stop at an end/error, close to editor, and verify no run or last-execution update was created.
- Test double-click editing and touch-accessible alternatives.
- Preserve a local draft through save failure; show warning/retry and unsaved-close protection.
- Detect a competing agent/UI update without silently overwriting it.

### 16.2 Conversation engine

Use shared fixture graphs and expected checkpoints for:

- Every T/T combination and group-by-group Next.
- First-position Switch alone, reveal selected T, then Next.
- Second-position Switch advancing directly to the selected next group.
- Go back restoring a previous pair or revealed Switch group.
- Revisiting unchanged selections without duplicate path entries.
- Changing a branch deleting all downstream conversation state, including after a merge.
- Notes surviving all navigation and branch correction.
- One-node terminal display, End call under the terminal node, and top-bar End call throughout.
- Ending before a terminal node without appending unseen content.
- Active runs remaining unchanged after source-script editing/deletion.

### 16.3 Live run persistence and completion

- No persisted normal run before valid lead submission.
- Safe retry of run creation after a lost response produces one run.
- Navigation and notes are continuously saved; refresh restores the correct display and notes.
- Two calls using the same script remain independent in different tabs.
- Interrupted calls remain Open in global history and can be resumed.
- End call opens exactly the specified evaluation form.
- Submit requires outcome, allows blank evaluation notes, shows spinner, and opens detail only after persistence.
- Failed completion retains data; retry does not create another run or extend completedAt.
- Completed runs reject edits but allow deletion.
- Local/server conflicts do not silently replace acknowledged newer data.
- A late update cannot recreate a deleted run.

### 16.4 History and API/MCP

- Show name, start date, optional duration, and Open/Closed flag.
- Filter by script ID even when names collide or a script is deleted.
- Preserve run access and snapshot content after source-script deletion.
- Authenticate browser pages, documentation, and downloads.
- Reject missing/incorrect API keys and prevent key access to runs or credential downloads.
- Exercise create/list/get/update script MCP tools using the same JSON definition as the editor.
- Save graph-invalid agent drafts with structured errors; reject schema-invalid payloads without corrupting prior state.
- Verify full replacement removes omitted graph elements and stale revisions return conflicts.
- Ensure keys/notes do not appear in logs or public frontend assets.

### 16.5 Deployment and UI

- Clean Docker Compose startup, migrations, readiness, and persistence across container replacement.
- Database backup and restore retain scripts, open runs, and completed snapshots.
- Desktop 2:1 call layout and fullscreen editor.
- Mobile node scrolling, notes toggle/fullscreen/close, and permanently accessible End call.
- Keyboard and touch access to primary actions and validation feedback.

## 17. Implementation sequence

1. Establish repository structure, Docker Compose, migrations, authentication, and API/schema contracts.
2. Implement script storage, graph validation, library, duplication/deletion, and revision checks.
3. Implement fullscreen editor, five-second autosave, validation feedback, and test runs.
4. Implement deterministic conversation engine and shared run/test presentation.
5. Implement run creation, snapshots, per-run live synchronization, recovery, and evaluation completion.
6. Implement global history, deleted-source filtering, immutable detail, and run deletion.
7. Implement downloadable MCP executable/configuration and protected documentation.
8. Verify failures, concurrency, responsive behavior, authentication boundaries, and deployment/restore.

The implementation is complete when the acceptance scenarios pass and the documented Docker deployment supports the full author → test → call → evaluate → review workflow.
