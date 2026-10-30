# Full-system verification

## Handset silhouette refinement — 30 October 2026

The initial C now uses a slimmer curved receiver grip, broad angled earpiece/mouthpiece housings, and transparent speaker-grille slots. Color, monochrome and PNG exports were regenerated together. The production build and **five brand Playwright checks passed without retries across all browser/device projects**. Large artwork, monochrome output and the small mobile navigation mark were visually inspected; evidence is in `.impeccable/review/handset/`. The local app is updated and healthy.

## Handset and rotary-dial wordmark — 30 October 2026

The new vector wordmark replaces the first C with a cobalt phone handset and the o in Coach with a rotary dial and green hub. Remaining letters use outlined Manrope 650, so exported files do not depend on installed fonts. Color SVG, monochrome SVG and transparent PNG are in `public/brand/`, with a repeatable generator in `scripts/create-logo.py`. Login, application navigation and gallery branding share one component; the release container now includes public assets.

TypeScript and the production image build passed. **15 targeted Playwright checks passed without retries across all five browser/device projects**, covering image decoding, accessible names/links, responsive placement, static asset delivery, gallery rendering and existing WCAG A/AA audits. Desktop/mobile captures were visually inspected and saved with the test log and presentation preview in `.impeccable/review/logo/`. The local application is updated.

## Conversation divider fix — 30 October 2026

The last conversation card now omits its bottom border even when navigation follows it as a sibling, removing the duplicate divider in test runs. The single rule above the controls and separators between cards remain. TypeScript and the production build passed; **10 targeted Playwright checks passed without retries across all five browser/device projects**. Coverage checks single/two-card presentations, test runs, live calls and completed reviews. Desktop/mobile captures were visually inspected and saved with the test log in `.impeccable/review/conversation-divider/`. The local app is updated and healthy.

## Unified add/connect handles — 30 October 2026

Each outgoing React Flow handle is now the green + button itself, including switch options. Clicking or pressing Enter/Space opens the add-node popover; dragging the same control connects to an incoming handle. The icon passes pointer events through to the handle. A movement threshold suppresses popovers after a drag, including a cancelled drag that returns to its starting handle. The adjacent buttons have been removed.

TypeScript and the production build passed. The final Compose run passed **25 targeted Playwright checks across all five browser/device projects, with no failures or retries**. Coverage includes dragging from the + center, cancelled drags, click/tap/keyboard popovers, switch-branch creation, focus return, popup accessibility and bounds, save/reload, and the graph-visibility regression. An initial Firefox layout assertion raced font loading; it now waits for `document.fonts.ready` before measuring selection geometry. Desktop/mobile captures were visually inspected and saved with the final test log in `.impeccable/review/unified-handles/`. The local application uses the tested image.

## Drag flicker/disappearance fix — 30 October 2026

The original controlled-node mapping rebuilt bare React Flow nodes on each pointer update, discarding measured dimensions and connection bounds. The regression reproduced missing edge paths in animation frames against the old build. The editor now keeps canvas nodes in local React Flow state, applies all node changes (including measurements), preserves dimensions during definition reconciliation, and writes positions only when a drag finishes or a keyboard move occurs. Geometry is explicitly refreshed when content/option identities change. Node action callbacks read current editor state so fast connection actions do not use stale closures.

TypeScript and production build passed. **25 targeted Playwright checks passed across all five browser/device projects**, with no failures or flaky results. The drag regression samples animation frames over three repeated drags, checks all nodes and edges remain visible, checks viewport stability away from auto-pan edges, and verifies untouched positions, keyboard movement, acknowledgement and reload persistence. Authoring, testing, selection, manual linking and add-node popovers were also exercised. Desktop/mobile post-drag captures and before/after test logs are in `.impeccable/review/drag-fix/`. The local web/API/database are healthy.

## Selection toolbar removal — 30 October 2026

Selecting a canvas node no longer adds a Selected node toolbar or changes canvas dimensions. The green selected perimeter and the node-local Edit/Test actions remain. TypeScript and production build passed. Twenty targeted Playwright checks passed across all five browser/device projects, covering stable canvas geometry after selection, local node actions, authoring/testing, handle linking and add-node popovers. No backend behavior changed. Updated evidence is in `.impeccable/review/no-selection-toolbar/`.

## Handle-add popover — 30 October 2026

Outgoing ports and adjacent green plus buttons open an anchored native popover. Talking point/Switch choices create, position and connect a node in one draft change, preserving the original successor through the insertion. Each switch option adds its own Talking point; a second Switch is disabled with an explanation. Existing-node drag linking remains, with a popover action for tap/keyboard linking. Escape and outside clicks dismiss the picker, and its position stays inside desktop/mobile viewports.

The final full Compose run passed **108 Playwright tests, 2 intentional skips, no failures or flaky results** across all five projects. New coverage checks both node types, switch-option identity, inserted successor preservation, save/reload, non-overlapping placement, keyboard focus/return, outside/Escape dismissal, mobile bounds and popup axe WCAG A/AA. The existing recovery test now explicitly resolves a legitimate lost-reply revision conflict before testing subsequent deletion. TypeScript, production build, Go race/PostgreSQL/MCP, container replacement and backup/restore checks passed. Desktop, phone and actual 945px in-app captures were visually inspected; evidence is under `.impeccable/review/handle-add/`.

## Node simplification — 30 October 2026

The editor and component gallery now support only Talking point and Switch. The JSON Schema, OpenAPI and MCP contract reject new Question nodes; existing stored Question content and locally retained drafts are adapted to Talking points without changing IDs, text, layout or links. Persisted call snapshots are not rewritten.

Connection dropdowns are removed from both node editors. Handles support mouse dragging, sequential taps and keyboard Enter/Space activation; Escape cancels an armed keyboard link. White focus rings distinguish focused handles on cobalt. Automatic fitting now uses the canvas's measurement-aware queue, avoiding delayed viewport movement during a drag.

The updated full Compose suite passed **103 Playwright tests with 2 intentional mobile keyboard skips**, no failures or flaky results, across the same five browser projects. The new test creates and persists a connection using drag on desktop and taps on mobile, reloads it, and confirms the node editor has no dropdown. Authoring also exercises keyboard handle linking. Four TypeScript domain tests and race-enabled Go/PostgreSQL/MCP integration passed, including legacy Question read compatibility and unchanged stored completed snapshots. Desktop, phone and the actual 945px in-app viewport were visually checked. Updated captures are in `.impeccable/review/node-simplification/`.

## Initial application verification — 29 October 2026

Verified on 29 October 2026 against spec.md, after approval of the component library. The application preserves the approved paper/ink/cobalt/green system, locally served Manrope, and spacious 22px/20px conversation text. Licensed Px Grotesk files were not supplied.

## Automated checks

Run the same full-stack command used by CI:

```sh
./scripts/test-compose.sh
```

It builds release web/API images and all five MCP executables, creates a fresh PostgreSQL database, runs migrations before readiness, then executes domain, database, SDK and browser tests. Each run uses disposable credentials and its own Compose project/volume. The normal application database is not used.

| Check | Result |
| --- | --- |
| TypeScript | `npm run typecheck` passed. |
| Production images | Next.js production build and static Go API/MCP builds passed. |
| Shared conversation fixtures | Three TypeScript fixtures and matching Go checkpoint tests passed. Covers text grouping, both switch positions, retained futures, and changed branches after merges. |
| Go domain and integration | Race-enabled tests passed against real PostgreSQL. Includes schema/graph validation, revisions, concurrent writes, snapshots, idempotency, deletion, auth/Origin boundaries, session revocation, rate limiting and secret-free logging. |
| MCP | Official SDK client negotiated stdio with the packaged server and exercised all five tools against the real API. |
| Playwright | 98 passed, 2 intentional skips across Chromium, Firefox, WebKit, mobile Chrome and mobile Safari emulation. No failures or flaky results in the final complete run. |
| Accessibility | Axe WCAG A/AA checks passed for login, scripts, runs, documentation, gallery and the evaluation dialog. Documentation JSON is keyboard-scrollable. |
| Deployment persistence | API/web container replacement preserved script/run records and timestamps. |
| Backup/restore | A PostgreSQL custom-format backup restored into a separate database with matching script/run checksums, including open and completed snapshots. |
| Helm | Lint passed. Bundled PostgreSQL and external PostgreSQL/TLS ingress variants rendered; strict Kubernetes 1.35 schema validation accepted all 8 and 6 resources respectively. |
| HTTPS overlay | Compose configuration and Caddy configuration validation passed. |
| Design detector | One final source scan returned no findings. |

The two skipped tests exercise desktop overlay keyboard wrapping on the two mobile projects. The same behavior passes on all three desktop engines; mobile touch controls and notes behavior are tested separately.

## Browser behavior covered

The UI suite exercises authoring, double-click editing and mobile edit controls, node/option identity, saved invalid graphs, save-before-test, error stops at an encountered second node, no test-run side effects, lead capture, lost creation responses, navigation/notes refresh, independent calls, branch pruning, source changes/deletion, evaluation with an explicit outcome, lost completion responses, immutable review, duplicate/sort/filter/delete controls, private downloads and ranges, and mobile layout/notes rotation.

Failure checks include IndexedDB recovery after a rejected write, unavailable local storage while server saving remains functional, invalid name correction, concurrent editor/run revisions with explicit resolution, and deleted-run precedence over pending work. Downloaded MCP configuration contains only the deployment agent key, stays authenticated/no-store, and the agent key cannot access calls or credential downloads. API logs are checked for test credentials and private call content.

## Visual verification

Full-page application captures cover login, library, canvas editor, node editing, test mode, lead capture, live call, evaluation, completed review, history and documentation at desktop and mobile sizes. Actual in-app browser captures additionally cover the 1280px viewport. Captures live in `.impeccable/review/application/`; generated CI evidence lives in `playwright-report/evidence/`.

The independent full-application finish reviewer returned **`ship`**, with no material fixes. All 24 required captures passed its evidence check. The review confirmed palette, typography, connected workflow, desktop proportions and mobile adaptations. See [finish review](application-finish-review.md), [design consistency](application-design-consistency.md) and [application contract](application-design.md). The approved DESIGN.md and sidecar are preserved as an ordinary extension; historical library-stage scope prose is called out in the consistency report.

## Release-environment limits

Automated browser engines and device emulation do not certify physical devices or vendor-distributed current stable Chrome/Edge, Firefox and Safari installations. Those checks remain for the release environment. Helm manifests were validated without deploying to a live cluster. No public HTTPS domain, certificate or production infrastructure was provisioned. The bundled PostgreSQL deployment is a single instance; an operator must configure production storage, backups and availability requirements.

Reports contain synthetic call data and can include disposable test credentials; restrict artifact access. Do not upload production credentials or call records as test evidence.
