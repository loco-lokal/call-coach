"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  Badge,
  Button,
  Field,
  Icon,
  Modal,
  SaveStatus,
  Select,
  TextArea,
  type SaveState,
} from "./ui";
import { CallWorkspace, ConversationCard } from "./conversation";
import { BrandWordmark } from "./brand";
import { EditorNode } from "./editor";
import { EvaluationForm, LeadForm, type Lead } from "./forms";
import {
  EmptyState,
  LoadingRows,
  RunTable,
  ScriptTable,
  type ScriptRecord,
} from "./records";

const sampleScripts: ScriptRecord[] = [
  {
    id: "discovery",
    name: "Discovery call",
    createdAt: "24 Oct 2026",
    updatedAt: "29 Oct 2026",
    lastExecutedAt: "29 Oct 2026",
    errors: 0,
  },
  {
    id: "follow-up",
    name: "A thoughtful follow-up",
    createdAt: "25 Oct 2026",
    updatedAt: "28 Oct 2026",
    lastExecutedAt: null,
    errors: 2,
  },
];
const sections = [
  ["conversation", "Conversation"],
  ["editor", "Editor nodes"],
  ["forms", "Forms"],
  ["feedback", "Feedback & states"],
  ["records", "Library & history"],
  ["foundations", "Foundations"],
];

function Section({
  id,
  title,
  description,
  children,
  tag,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  tag?: string;
}) {
  const words = title.split(" ");
  const emphasis = words.pop();
  return (
    <section
      id={id}
      className="library-section"
      aria-labelledby={`${id}-title`}
    >
      <div className="section-heading">
        <div>
          <h2 id={`${id}-title`}>
            {words.length > 0 ? `${words.join(" ")} ` : null}
            <span className="word-outline">{emphasis}</span>
          </h2>
          <p>{description}</p>
        </div>
        {tag && <span className="section-tag">{tag}</span>}
      </div>
      {children}
    </section>
  );
}

function ConversationDemo() {
  const [step, setStep] = useState(0);
  const [option, setOption] = useState<string>();
  const [notes, setNotes] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [finished, setFinished] = useState(false);
  return (
    <>
      <CallWorkspace
        title="Alex Morgan"
        subtitle="Northline Studio · Discovery call"
        notes={notes}
        onNotesChange={setNotes}
        onEnd={() => setEvaluating(true)}
        sample
        status={
          <span className="preview-status">
            Preview only · changes stay in this page
          </span>
        }
        controls={
          <>
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => {
                setStep(0);
                setOption(undefined);
              }}
            >
              <Icon name="back" />
              Go back
            </Button>
            {step === 0 ? (
              <Button variant="primary" onClick={() => setStep(1)}>
                Next
                <Icon name="arrow" />
              </Button>
            ) : option ? (
              <Button variant="primary" onClick={() => setEvaluating(true)}>
                End sample call
                <Icon name="check" />
              </Button>
            ) : (
              <span className="control-hint">
                Choose a response to continue
              </span>
            )}
          </>
        }
      >
        {step === 0 ? (
          <>
            <ConversationCard
              node={{
                id: "intro",
                type: "talking_point",
                text: "Hi Alex, thanks for making a little time today. I’d love to understand how your team handles new enquiries, and where things could be easier.",
              }}
            />
            <ConversationCard
              node={{
                id: "discovery",
                type: "talking_point",
                text: "What happens between a new enquiry coming in and your team getting back to them?",
              }}
            />
          </>
        ) : (
          <>
            <ConversationCard
              node={{
                id: "interest",
                type: "switch",
                name: "Is there room to improve the process?",
                options: [
                  { id: "yes", label: "Yes, it’s a challenge" },
                  { id: "no", label: "Not a priority right now" },
                ],
              }}
              selectedOption={option}
              onSelect={setOption}
            />
            {option && (
              <ConversationCard
                node={{
                  id: "response",
                  type: "talking_point",
                  text:
                    option === "yes"
                      ? "Let’s explore that. Where does the process tend to slow down, and what would a better day look like for your team?"
                      : "That makes sense. Thank you for sharing how things work today. If your priorities change, I’m happy to pick this up again.",
                }}
              />
            )}
          </>
        )}
      </CallWorkspace>
      <Modal
        open={evaluating}
        onClose={() => setEvaluating(false)}
        title="How was the call?"
      >
        {finished ? (
          <div className="completion-state">
            <span className="completion-check">
              <Icon name="check" />
            </span>
            <h3>Sample complete</h3>
            <p>This was a component preview. No call record was created.</p>
            <Button
              variant="primary"
              onClick={() => {
                setFinished(false);
                setEvaluating(false);
                setStep(0);
                setOption(undefined);
              }}
            >
              Return to preview
            </Button>
          </div>
        ) : (
          <>
            <p className="modal-intro">
              Try the ending form. No outcome is selected for you.
            </p>
            <EvaluationForm
              submitLabel="Complete sample"
              onSubmit={() => setFinished(true)}
            />
          </>
        )}
      </Modal>
    </>
  );
}

export function ComponentLibrary() {
  const [activeSection, setActiveSection] = useState("conversation");
  const [editedText, setEditedText] = useState(
    "Introduce yourself and explain the reason for calling.",
  );
  const [switchName, setSwitchName] = useState("Is the lead interested?");
  const [nodeEdit, setNodeEdit] = useState<string | null>(null);
  const [nodeDraft, setNodeDraft] = useState("");
  const [nodeTest, setNodeTest] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<number>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [retry, setRetry] = useState(false);
  const [buttonBusy, setButtonBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scripts, setScripts] = useState(sampleScripts);
  const [deleting, setDeleting] = useState<ScriptRecord | null>(null);
  const [sort, setSort] = useState("updated");
  const [outcome, setOutcome] = useState("");
  function openNode(label: string, text: string) {
    setNodeEdit(label);
    setNodeDraft(text);
  }
  const sorted = [...scripts].sort((a, b) =>
    sort === "name"
      ? a.name.localeCompare(b.name)
      : b.updatedAt.localeCompare(a.updatedAt),
  );

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to component library
      </a>
      <header className="library-header">
        <a
          href="/components"
          className="wordmark"
          aria-label="Call Coach component library"
        >
          <BrandWordmark />
        </a>
        <span className="header-divider" />
        <span className="header-label">Component library</span>
        <Badge tone="green">For review</Badge>
      </header>
      <div className="library-layout">
        <aside className="library-sidebar">
          <p className="sidebar-title">In this library</p>
          <nav aria-label="Component sections">
            {sections.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={activeSection === id ? "location" : undefined}
                onClick={() => setActiveSection(id)}
              >
                {label}
                <Icon name="chevron" />
              </a>
            ))}
          </nav>
          <div className="sidebar-note">
            <Icon name="layers" />
            <p>
              Small building blocks.
              <br />
              One consistent workspace.
            </p>
            <span>Review before full UI build</span>
          </div>
        </aside>
        <main id="main" className="library-main">
          <div className="page-intro">
            <div>
              <h1>
                Less <span className="word-outline">interface</span>.
                <br className="mobile-break" /> More conversation.
              </h1>
              <p>
                The building blocks for Call Coach. A focused system that keeps
                the next step clear and the conversation in view.
              </p>
            </div>
            <div className="review-note">
              <span className="review-dot" />
              Interactive component preview
              <span>All names and records are sample data.</span>
            </div>
          </div>

          <Section
            id="conversation"
            title="Conversation"
            description="Two points at a time. Space to listen, choose, and take notes."
            tag="Try the flow"
          >
            <ConversationDemo />
          </Section>

          <Section
            id="editor"
            title="Editor nodes"
            description="Distinct types, the same visual language. Select a node to test it, or open Edit."
            tag="Interactive specimens"
          >
            <div className="node-specimen">
              <div className="specimen-toolbar">
                <span>
                  <Icon name="layers" />
                  Workflow components
                </span>
                <span>Node specimens · canvas comes after review</span>
              </div>
              <div className="editor-nodes">
                <EditorNode
                  type="talking_point"
                  text={editedText}
                  start
                  selected={selectedNode === 0}
                  onSelect={() => setSelectedNode(0)}
                  onEdit={() => openNode("Talking point", editedText)}
                  onPlay={() => setNodeTest("Talking point")}
                />
                <EditorNode
                  type="switch"
                  text={switchName}
                  options={["Interested", "Not interested"]}
                  error="Connect the Not interested option."
                  selected={selectedNode === 1}
                  onSelect={() => setSelectedNode(1)}
                  onEdit={() => openNode("Switch", switchName)}
                  onPlay={() => setNodeTest("Switch")}
                />
              </div>
            </div>
            <p className="specimen-caption">
              Visible labels identify the node type. Start and validation states
              have text as well as color.
            </p>
          </Section>

          <Section
            id="forms"
            title="Forms"
            description="Only what’s needed to begin, and a deliberate choice when the call ends."
          >
            <div className="forms-specimen">
              <div>
                <div className="form-heading">
                  <h3>Before you call</h3>
                  <p>Lead details are required before a call starts.</p>
                </div>
                {lead ? (
                  <div className="form-success" role="status">
                    <Icon name="check" />
                    <h4>Ready for {lead.name}</h4>
                    <p>
                      {lead.company} · {lead.phone}
                    </p>
                    <p>Preview validated. No call was started.</p>
                    <Button onClick={() => setLead(null)}>
                      Try another lead
                    </Button>
                  </div>
                ) : (
                  <LeadForm onSubmit={setLead} />
                )}
              </div>
              <div>
                <div className="form-heading">
                  <h3>How was the call?</h3>
                  <p>Choose an outcome. Add context if it helps.</p>
                </div>
                <EvaluationForm
                  submitLabel="Try completion"
                  onSubmit={({ outcome }) =>
                    setOutcome(
                      `Sample marked as ${outcome}. No record was saved.`,
                    )
                  }
                />
                {outcome && (
                  <p role="status" className="inline-success">
                    <Icon name="check" />
                    {outcome}
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Section
            id="feedback"
            title="Feedback & states"
            description="Clear about what’s saved, what needs attention, and what happens next."
          >
            <div className="state-list">
              {(
                [
                  "saved",
                  "saving",
                  "unsaved",
                  "error",
                  "conflict",
                ] as SaveState[]
              ).map((state) => (
                <div key={state}>
                  <SaveStatus state={state} announce={false} />
                  <span>
                    {
                      {
                        saved: "Acknowledged by the server",
                        saving: "Write in progress",
                        unsaved: "Local changes are waiting",
                        error: "Keep the draft and offer a retry",
                        conflict: "Let the rep choose which version to keep",
                      }[state]
                    }
                  </span>
                </div>
              ))}
            </div>
            <div className="alerts-specimen">
              {!retry ? (
                <Alert
                  title="Your latest changes haven’t been saved"
                  action={
                    <Button onClick={() => setRetry(true)}>Retry sample</Button>
                  }
                >
                  Your draft is still here. Check your connection and try again.
                </Alert>
              ) : (
                <div role="status" className="retry-success">
                  <Icon name="check" />
                  <div>
                    <strong>Retry action received</strong>
                    <p>This is a sample state. No server save was attempted.</p>
                  </div>
                  <Button variant="ghost" onClick={() => setRetry(false)}>
                    Reset
                  </Button>
                </div>
              )}
              <Alert
                title="This script changed in another session"
                tone="error"
                action={
                  <Button
                    onClick={() =>
                      setMessage(
                        "In the app, this will show the saved version beside your retained local draft.",
                      )
                    }
                  >
                    Review versions
                  </Button>
                }
              >
                Your local draft is kept. Review the saved version before
                replacing it.
              </Alert>
            </div>
            <div className="empty-loading">
              <EmptyState
                title="Your first script starts here"
                action={
                  <Button
                    onClick={() =>
                      setMessage(
                        "Create script will open the workflow editor after the component review.",
                      )
                    }
                  >
                    <Icon name="plus" className="add-mark" />
                    Create script
                  </Button>
                }
              >
                Write a few talking points, connect a switch, and choose where
                the conversation can go.
              </EmptyState>
              <div>
                <h3>While scripts load</h3>
                <LoadingRows />
              </div>
            </div>
          </Section>

          <Section
            id="records"
            title="Library & history"
            description="Readable rows, useful dates, and a clear way back into an open call."
            tag="Sample records"
          >
            <div className="records-header">
              <h3>Scripts</h3>
              <Select
                label="Sort scripts"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="updated">Recently updated</option>
                <option value="name">Name, A–Z</option>
              </Select>
            </div>
            <ScriptTable
              scripts={sorted}
              onEdit={(script) =>
                setMessage(
                  `Edit ${script.name}: the full workflow editor follows the component review.`,
                )
              }
              onPlay={(script) =>
                setMessage(
                  `Start ${script.name}: try the lead form above to review this component.`,
                )
              }
              onDelete={setDeleting}
            />
            <div className="records-header history-heading">
              <h3>Runs</h3>
              <span className="subtle">
                Open calls remain available to resume.
              </span>
            </div>
            <RunTable
              runs={[
                {
                  id: "run1",
                  lead: "Alex Morgan",
                  company: "Northline Studio",
                  script: "Discovery call",
                  started: "29 Oct 2026, 10:42",
                  duration: null,
                  open: true,
                },
                {
                  id: "run2",
                  lead: "Jordan Lee",
                  company: "Fieldwork",
                  script: "Discovery call",
                  started: "28 Oct 2026, 14:15",
                  duration: "12m 34s",
                  open: false,
                },
              ]}
              onOpen={(run) =>
                setMessage(
                  `${run.open ? "Resume" : "View"} sample call with ${run.lead}. Run persistence and detail screens follow the component review.`,
                )
              }
            />
          </Section>

          <Section
            id="foundations"
            title="Foundations"
            description="A restrained palette, comfortable type, and actions with room to breathe."
          >
            <div className="foundations-grid">
              <div>
                <h3>Color with a job</h3>
                <div className="palette">
                  {[
                    ["ink", "Ink", "#120E20"],
                    ["accent", "Blue", "#004DCE"],
                    ["green", "Green", "#4EF992"],
                    ["surface", "Mist", "#E6E6EC"],
                    ["red", "Error", "#A62D35"],
                  ].map(([key, label, hex]) => (
                    <div key={key}>
                      <span className={`swatch swatch--${key}`} />
                      <strong>{label}</strong>
                      <span>{hex}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3>One type family</h3>
                <p className="type-specimen">
                  Clear words.
                  <br />
                  Comfortable rhythm.
                </p>
                <p className="subtle">
                  Manrope · locally served · regular-weight grotesque substitute
                </p>
              </div>
            </div>
            <div className="button-specimen">
              <div>
                <h3>Actions</h3>
                <p>One primary action at a time.</p>
              </div>
              <div className="button-row">
                <Button
                  variant="primary"
                  onClick={() =>
                    setMessage(
                      "Primary action selected. Use the conversation preview to try Next in context.",
                    )
                  }
                >
                  Continue
                  <Icon name="arrow" />
                </Button>
                <Button
                  onClick={() => setMessage("Secondary action selected.")}
                >
                  Secondary
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMessage("Back action selected.")}
                >
                  <Icon name="back" />
                  Go back
                </Button>
                <Button disabled>Unavailable</Button>
                <Button
                  busy={buttonBusy}
                  onClick={() => {
                    setButtonBusy(true);
                    window.setTimeout(() => {
                      setButtonBusy(false);
                      setMessage("Sample loading action finished.");
                    }, 800);
                  }}
                >
                  Try loading
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setDeleting(sampleScripts[0])}
                >
                  Delete script
                </Button>
              </div>
            </div>
            <div className="input-specimen">
              <Field
                label="Script name"
                defaultValue="Discovery call"
                hint="Names can be shared by more than one script."
              />
              <Field
                label="Field with an error"
                defaultValue=""
                error="Give this script a name before continuing."
              />
              <Field
                label="Unavailable field"
                value="Read-only example"
                disabled
              />
            </div>
          </Section>
          <footer className="library-bottom">
            <span className="wordmark">
              <BrandWordmark />
            </span>
            <p>
              Component review · Full application screens follow your feedback.
            </p>
            <a href="#main">Back to top</a>
          </footer>
        </main>
      </div>

      <Modal
        open={!!nodeEdit}
        title={`Edit ${nodeEdit ?? "node"}`}
        onClose={() => setNodeEdit(null)}
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (nodeEdit === "Talking point") setEditedText(nodeDraft);
            if (nodeEdit === "Switch") setSwitchName(nodeDraft);
            setNodeEdit(null);
          }}
        >
          <TextArea
            label={nodeEdit === "Switch" ? "Switch name" : "Node text"}
            value={nodeDraft}
            onChange={(e) => setNodeDraft(e.target.value)}
            rows={5}
          />
          <p className="subtle">
            Sample component editor. Changes stay in this page.
          </p>
          <div className="button-row">
            <Button onClick={() => setNodeEdit(null)}>Cancel</Button>
            <Button variant="primary" type="submit">
              Apply to preview
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!nodeTest}
        title="Test from node"
        onClose={() => setNodeTest(null)}
      >
        <p className="modal-intro">
          The full test runner follows the component review. This specimen shows
          its node and error presentation.
        </p>
        {nodeTest === "Switch" ? (
          <Alert title="Connect the Not interested option" tone="error">
            This node has an error. Testing stops here.
          </Alert>
        ) : (
          <ConversationCard
            node={{
              id: "sample",
              type: "talking_point",
              text: editedText,
            }}
          />
        )}
        <div className="test-close">
          <Button onClick={() => setNodeTest(null)}>Close test</Button>
        </div>
      </Modal>
      <Modal
        open={!!deleting}
        title="Delete this script?"
        onClose={() => setDeleting(null)}
      >
        <p className="modal-intro">
          Remove “{deleting?.name}” from this sample library? Existing runs
          remain available.
        </p>
        <p className="subtle">
          This only changes the preview. Reload to restore sample records.
        </p>
        <div className="button-row dialog-actions">
          <Button onClick={() => setDeleting(null)}>Keep script</Button>
          <Button
            variant="danger"
            onClick={() => {
              setScripts(
                scripts.filter((script) => script.id !== deleting?.id),
              );
              setDeleting(null);
            }}
          >
            Delete from preview
          </Button>
        </div>
      </Modal>
      <div className="preview-message" role="status" aria-live="polite">
        {message && (
          <>
            <Icon name="check" />
            <p>{message}</p>
            <Button
              variant="ghost"
              aria-label="Dismiss preview message"
              onClick={() => setMessage("")}
            >
              <Icon name="close" />
            </Button>
          </>
        )}
      </div>
    </>
  );
}
