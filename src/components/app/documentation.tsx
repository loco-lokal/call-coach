import { Shell, PageTitle } from "./shell";
export function Documentation() {
  return (
    <Shell active="docs">
      <PageTitle first="Make room" emphasis="for good calls">
        <p>A short guide to scripts, calls, and agent-assisted authoring.</p>
      </PageTitle>
      <div className="documentation">
        <nav aria-label="Documentation sections">
          <a href="#write">Write a script</a>
          <a href="#rules">Graph rules</a>
          <a href="#agents">Connect an agent</a>
          <a href="#api">API & revisions</a>
          <a href="#operations">Deployment & recovery</a>
        </nav>
        <section id="write">
          <h2>
            Write a <span className="word-outline">script</span>
          </h2>
          <p>
            Create a script, add nodes, and mark exactly one as the conversation
            start. Double-click a node or use Edit. Click an outgoing + handle
            to choose the next node; it is placed and connected automatically.
            Existing paths are retained through the inserted node. Switch
            options each have their own + handle; another switch requires an
            intervening talking point. To link existing nodes, drag that same +
            handle to an incoming handle, or choose Connect to existing node in
            the popover and tap an incoming handle. Keyboard users can press
            Enter on a handle and use the same actions; Escape cancels. Select
            an edge and press Delete to remove it. The canvas supports pan,
            zoom, fit, and touch controls.
          </p>
          <dl>
            <dt>Talking point</dt>
            <dd>
              Plain text for the rep to say, including any questions. Zero or
              one next node; no successor means the conversation can end.
            </dd>
            <dt>Switch</dt>
            <dd>
              A named decision with at least two labeled options. Each option
              connects to a talking point.
            </dd>
          </dl>
          <p>
            Drafts save every five seconds when changed. Test from here first
            flushes the latest draft, then uses the saved validation results.
            Tests can begin at any selected node and stop at errors. They never
            create a call or update last execution.
          </p>
        </section>
        <section id="rules">
          <h2>
            Graph <span className="word-outline">rules</span>
          </h2>
          <p>
            Normal calls require a valid graph: nonempty script, one start,
            unique node IDs, unique option IDs within each switch, nonblank
            text/names/labels, at least two switch options with destinations,
            existing targets, no consecutive switches, no directed cycles, and
            no unreachable nodes. Branches may merge and text nodes may end the
            path.
          </p>
          <p>
            Graph-invalid drafts are saved with structured errors. Unsupported
            schema versions, node types, value types, and oversized definitions
            are rejected without replacing the saved draft. Go is authoritative
            for validation.
          </p>
          <a
            className="button button--primary"
            download
            href="/api/v1/docs/script-schema"
          >
            Download JSON Schema
          </a>
        </section>
        <section id="agents">
          <h2>
            Connect an <span className="word-outline">agent</span>
          </h2>
          <p>
            Download the executable matching the machine running your MCP
            client. It communicates through stdio and calls this application’s
            HTTP API. Mark it executable on macOS/Linux with{" "}
            <code>chmod +x call-coach-mcp-*</code>. The executable contains no
            API key.
          </p>
          <div className="download-list">
            {[
              "darwin-arm64",
              "darwin-amd64",
              "linux-arm64",
              "linux-amd64",
              "windows-amd64",
            ].map((p) => (
              <a key={p} download href={`/api/v1/docs/mcp-downloads/${p}`}>
                {p.replace("darwin", "macOS")} executable
              </a>
            ))}
          </div>
          <p>
            <strong>
              The configuration download contains your deployment API key.
            </strong>{" "}
            Keep it private. Replace the command path with the absolute path to
            the executable you downloaded. Different MCP clients use different
            wrappers: map the command and environment fields to your client’s
            server configuration.
          </p>
          <a
            className="button button--primary"
            download
            href="/api/v1/docs/mcp-config"
          >
            Download private MCP configuration
          </a>
          <p>
            Available tools: list_scripts, get_script, create_script,
            update_script, get_script_schema. Ask an agent to create or revise a
            branching schemaVersion 1 script, then review and test it here.
            Agents cannot delete scripts, start calls, or read run history.
          </p>
        </section>
        <section id="api">
          <h2>
            API & <span className="word-outline">revisions</span>
          </h2>
          <p>
            Agent requests use{" "}
            <code>Authorization: Bearer &lt;deployment-api-key&gt;</code>.
            Browser requests use the shared-password session. Both use{" "}
            <code>/api/v1</code> on this origin. Updates replace the whole
            definition, including positions: omitted nodes/options/connections
            are removed.
          </p>
          <p>
            Always read the current revision before updating. A stale
            expectedRevision returns HTTP 409; reload, review, then explicitly
            apply your draft against the new revision. Never repeatedly
            overwrite a competing update.
          </p>
          <pre tabIndex={0} aria-label="Example script JSON">
            {JSON.stringify(
              {
                name: "First conversation",
                definition: {
                  schemaVersion: 1,
                  nodes: [
                    {
                      id: "intro",
                      type: "talking_point",
                      isStart: true,
                      text: "Introduce yourself and listen.",
                      next: null,
                    },
                  ],
                },
              },
              null,
              2,
            )}
          </pre>
          <p>
            An invalid graph returns <code>validation</code> errors with code,
            message, nodeId/optionId/field where relevant. Saving an empty draft
            succeeds with EMPTY_SCRIPT and MISSING_START; normal calls remain
            blocked.
          </p>
          <a download href="/api/v1/docs/openapi">
            Download OpenAPI contract
          </a>
        </section>
        <section id="operations">
          <h2>
            Keep your <span className="word-outline">work</span>
          </h2>
          <p>
            Calls are created only after lead details are submitted. Navigation
            is saved promptly; notes and evaluation edits are debounced for one
            second. Pending work is stored in IndexedDB before network writes.
            Failed writes retry with 1, 2, 5, 10, then 30-second backoff. Keep
            this page open if local storage itself fails.
          </p>
          <p>
            Open calls remain in Runs and keep the frozen script they started
            with. Editing or deleting the source cannot change them. Ending
            opens evaluation; completing requires an explicit outcome and makes
            the record read-only. Deleted runs cannot be recovered through the
            app.
          </p>
          <p>
            Configure the shared password and agent key through
            CALL_COACH_PASSWORD and CALL_COACH_API_KEY in your deployment
            secret. Restart after rotation; revoke existing browser sessions
            using the documented operator command. Old MCP configurations stop
            working after key rotation. No secret belongs in NEXT_PUBLIC
            variables.
          </p>
          <p>
            Use HTTPS for production and one public origin. PostgreSQL owns
            acknowledged state; persistent volumes and verified backups are
            required. Operator backups may retain records deleted from the live
            database. See the repository’s deployment and backup/restore guide.
          </p>
        </section>
      </div>
    </Shell>
  );
}
