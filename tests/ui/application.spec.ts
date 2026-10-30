import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, mkdirSync } from "node:fs";
import {
  login,
  request,
  notes,
  expectNotes,
  expectSingleControlDivider,
  origin,
} from "./helpers";
import type { Script, Run, Definition } from "../../src/lib/domain";
const fixtures = JSON.parse(
  readFileSync("backend/contract/conversation-fixtures.json", "utf8"),
) as { definition: Definition }[];
const evidence = process.env.UI_EVIDENCE_DIR;
async function snapshot(page: Page, info: TestInfo, name: string) {
  if (!evidence || !["chromium", "mobile-chrome"].includes(info.project.name))
    return;
  mkdirSync(evidence, { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  const device = info.project.name === "chromium" ? "desktop" : "mobile";
  await page.screenshot({
    path: `${evidence}/application-${name}-${device}.png`,
    fullPage: true,
  });
}

async function create(page: Page, definition = fixtures[1].definition) {
  return request<Script>(page.request, "POST", "/scripts", {
    name: `Conversation ${crypto.randomUUID().slice(0, 8)}`,
    definition,
  });
}
async function start(page: Page, s: Script) {
  return request<Run>(page.request, "POST", "/runs", {
    scriptId: s.id,
    expectedScriptRevision: s.revision,
    lead: { name: "Alex Sample", company: "Sample Studio", phone: "local 123" },
    clientRequestId: crypto.randomUUID(),
  });
}

test("brand wordmark loads on login, application navigation, and the gallery", async ({
  page,
}, info) => {
  const logo = page.getByRole("img", { name: "Call Coach", exact: true });
  const expectLoaded = async () => {
    for (const image of await logo.all()) {
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const box = (await image.boundingBox())!;
      expect(box.width).toBeGreaterThan(150);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  };
  await page.goto("/login");
  await expect(logo).toHaveCount(1);
  await expectLoaded();
  await expect(
    page.getByRole("link", { name: "Call Coach", exact: true }),
  ).toHaveAttribute("href", "/login");
  await snapshot(page, info, "logo-login");
  await login(page);
  await page.goto("/scripts");
  await expect(logo).toHaveCount(1);
  await expectLoaded();
  await expect(
    page.getByRole("link", { name: "Call Coach", exact: true }),
  ).toHaveAttribute("href", "/scripts");
  expect(
    await page
      .locator(".app-header")
      .evaluate((header) => header.scrollWidth <= header.clientWidth),
  ).toBe(true);
  await snapshot(page, info, "logo-scripts");
  await page.goto("/components");
  await expect(logo).toHaveCount(2);
  await expectLoaded();
  for (const asset of [
    "call-coach.svg",
    "call-coach-mono.svg",
    "call-coach.png",
  ]) {
    expect((await page.request.get(`/brand/${asset}`)).ok()).toBe(true);
  }
});

test("author, test latest draft, call, evaluate, and review after source deletion", async ({
  page,
  isMobile,
}, info) => {
  await login(page);
  await page.goto("/scripts");
  await snapshot(page, info, "scripts");
  await page
    .getByRole("button", { name: "Create script", exact: true })
    .first()
    .click();
  const creation = page.getByRole("dialog", {
    name: "Create script",
    exact: true,
  });
  const name = `Authored ${crypto.randomUUID().slice(0, 8)}`;
  await creation.getByLabel("Script name").fill(name);
  await creation
    .getByRole("button", { name: "Create script", exact: true })
    .click();
  await page.waitForURL(/\/scripts\/[a-f0-9-]+$/);
  const scriptID = page.url().split("/").pop()!;
  try {
    await page
      .getByRole("button", { name: "Add talking point", exact: true })
      .click();
    let dialog = page.getByRole("dialog", {
      name: "Edit talking point",
      exact: true,
    });
    await dialog
      .getByLabel("Node text")
      .fill("Introduce yourself and make time to listen.");
    await snapshot(page, info, "node-editor");
    await dialog.getByRole("button", { name: "Apply changes" }).click();
    await page
      .getByRole("button", { name: "Add talking point", exact: true })
      .click();
    dialog = page.getByRole("dialog", {
      name: "Edit talking point",
      exact: true,
    });
    await dialog
      .getByLabel("Node text")
      .fill("How does your team handle new enquiries?");
    await dialog.getByRole("button", { name: "Apply changes" }).click();
    const point = page
      .getByRole("article", {
        name: "Talking point workflow node",
      })
      .filter({ hasText: /Introduce yourself|A revised introduction/ });
    if (isMobile)
      await point
        .getByRole("button", { name: "Edit node", exact: true })
        .click();
    else await point.dblclick();
    dialog = page.getByRole("dialog", {
      name: "Edit talking point",
      exact: true,
    });
    await expect(dialog.getByRole("combobox")).toHaveCount(0);
    await dialog
      .getByLabel("Node text")
      .fill("A revised introduction before testing.");
    await dialog.getByRole("button", { name: "Apply changes" }).click();
    await point
      .getByRole("button", { name: "Add next node", exact: true })
      .press("Enter");
    await page
      .getByRole("dialog", { name: "Add next node", exact: true })
      .getByRole("button", { name: "Connect to existing node", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Incoming connection to How does your team handle new enquiries?",
        exact: true,
      })
      .press("Enter");
    await expect(
      page.getByRole("button", { name: "Add question", exact: true }),
    ).toHaveCount(0);
    await point.click();
    const play = page.getByRole("button", {
      name: "Test A revised introduction before testing.",
      exact: true,
    });
    await expect(play).toBeVisible();
    await play.click();
    await expect(
      page.getByRole("heading", { name: "Test conversation", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("A revised introduction before testing.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("How does your team handle new enquiries?", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("End of test.", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "End call", exact: true }),
    ).toHaveCount(0);
    await expectSingleControlDivider(page.locator(".test-conversation"));
    await snapshot(page, info, "test");
    const saved = await request<Script>(
      page.request,
      "GET",
      `/scripts/${scriptID}`,
    );
    expect(saved.runnable).toBe(true);
    expect(saved.lastExecutedAt).toBeNull();
    const empty = await request<{ total: number }>(
      page.request,
      "GET",
      `/runs?scriptId=${scriptID}`,
    );
    expect(empty.total).toBe(0);
    await page.getByRole("button", { name: "Close test", exact: true }).click();
    await expect(point).toBeVisible();
    await expect(point).toContainText("A revised introduction before testing.");
    await expect
      .poll(async () =>
        point.evaluate((node) => {
          const style = getComputedStyle(node);
          return {
            width: node.getBoundingClientRect().width,
            opacity: style.opacity,
            visibility: style.visibility,
          };
        }),
      )
      .toMatchObject({ opacity: "1", visibility: "visible" });
    await page.getByRole("button", { name: "Fit View", exact: true }).click();
    await expect.poll(async () => point.boundingBox()).not.toBeNull();
    await snapshot(page, info, "editor");
    await page.getByRole("button", { name: "Start call", exact: true }).click();
    await page.waitForURL(/\/call$/);
    await page.getByLabel("Lead name", { exact: false }).fill("Taylor Example");
    await page.getByLabel("Company", { exact: false }).fill("Sample Studio");
    await page.getByLabel("Phone number", { exact: false }).fill("local 456");
    await snapshot(page, info, "lead");
    let acceptedRun: string | undefined;
    await page.route(
      "**/api/v1/runs",
      async (route) => {
        const response = await route.fetch();
        acceptedRun = (await response.json()).id;
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page.getByRole("button", { name: "Start call", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Could not start the call" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start call", exact: true }).click();
    await page.waitForURL(/\/runs\/[a-f0-9-]+$/);
    expect(page.url().split("/").pop()).toBe(acceptedRun);
    const runID = page.url().split("/").pop()!;
    try {
      await notes(page, isMobile, "Follow up on Friday.");
      await expect
        .poll(
          async () =>
            (await request<Run>(page.request, "GET", `/runs/${runID}`))
              .callNotes,
        )
        .toBe("Follow up on Friday.");
      await page.reload();
      await expectNotes(page, isMobile, "Follow up on Friday.");
      await expectSingleControlDivider(page.locator(".conversation-area"));
      if (
        evidence &&
        ["chromium", "mobile-chrome"].includes(info.project.name)
      ) {
        mkdirSync(evidence, { recursive: true });
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: `${evidence}/application-call-${isMobile ? "mobile" : "desktop"}.png`,
          fullPage: true,
        });
      }
      await page
        .locator(".call-header")
        .getByRole("button", { name: "End call", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "How was the call?", exact: true }),
      ).toBeVisible();
      await snapshot(page, info, "evaluation");
      await page
        .getByRole("button", { name: "Complete call", exact: true })
        .click();
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Choose Success or Failure" }),
      ).toBeVisible();
      await page.getByRole("radio", { name: "Success", exact: true }).check();
      let acceptedCompletion: string | undefined;
      await page.route(
        `**/api/v1/runs/${runID}/complete`,
        async (route) => {
          const response = await route.fetch();
          acceptedCompletion = (await response.json()).completedAt;
          await route.abort("failed");
        },
        { times: 1 },
      );
      await page
        .getByRole("button", { name: "Complete call", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Call review", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("No evaluation notes.", { exact: true }),
      ).toBeVisible();
      await expectSingleControlDivider(page.locator(".conversation-area"));
      await snapshot(page, info, "completed");
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Call review", exact: true }),
      ).toBeVisible();
      const completed = await request<Run>(
        page.request,
        "GET",
        `/runs/${runID}`,
      );
      expect(completed.phase).toBe("completed");
      expect(completed.completedAt).toBe(acceptedCompletion);
      expect(completed.callNotes).toBe("Follow up on Friday.");
      await request(page.request, "DELETE", `/scripts/${scriptID}`);
      await page.goto(`/runs?scriptId=${scriptID}`);
      await expect(
        page.getByRole("option", { name, exact: true }),
      ).toBeAttached();
      await expect(
        page.getByRole("cell", { name: "Closed", exact: true }),
      ).toBeVisible();
      await snapshot(page, info, "history");
      await page.getByRole("link", { name: "View", exact: true }).click();
      await expect(
        page.getByText("A revised introduction before testing.", {
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await page.request
        .delete(`/api/v1/runs/${runID}`, {
          headers: { Origin: origin },
          timeout: 3000,
        })
        .catch(() => {});
    }
  } finally {
    await page.request
      .delete(`/api/v1/scripts/${scriptID}`, {
        headers: { Origin: origin },
        timeout: 3000,
      })
      .catch(() => {});
  }
});

test("branches prune retained future while notes and independent calls survive source changes", async ({
  page,
  isMobile,
}) => {
  await login(page);
  const s = await create(page);
  const r = await start(page, s),
    other = await start(page, s);
  try {
    await page.goto(`/runs/${r.id}`);
    await notes(page, isMobile, "Independent notes");
    await expect(
      page.getByRole("button", { name: "Next", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await expect(page.getByText("yes-path", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("end", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await page.getByRole("button", { name: "No", exact: true }).click();
    await expect(page.getByText("no-path", { exact: true })).toBeVisible();
    await expect
      .poll(
        async () =>
          (await request<Run>(page.request, "GET", `/runs/${r.id}`)).progress
            .retainedNodeIds,
      )
      .toEqual(["a", "s", "no-path", "merge"]);
    await expectNotes(page, isMobile, "Independent notes");
    const acknowledged = await request<Run>(
      page.request,
      "GET",
      `/runs/${r.id}`,
    );
    await request(page.request, "PUT", `/runs/${r.id}/state`, {
      expectedRevision: acknowledged.revision,
      progress: acknowledged.progress,
      callNotes: "Saved elsewhere",
      phase: "in_progress",
      outcome: null,
      evaluationNotes: "",
    });
    await notes(page, isMobile, "Retained competing local note");
    await expect(
      page.getByRole("region", { name: "Review conflicting versions" }),
    ).toBeVisible();
    expect(
      (await request<Run>(page.request, "GET", `/runs/${r.id}`)).callNotes,
    ).toBe("Saved elsewhere");
    await page
      .getByRole("button", { name: "Load saved version", exact: true })
      .click();
    await expectNotes(page, isMobile, "Saved elsewhere");
    await request(page.request, "PUT", `/scripts/${s.id}`, {
      expectedRevision: s.revision,
      name: "Source changed",
      definition: fixtures[0].definition,
    });
    await request(page.request, "DELETE", `/scripts/${s.id}`);
    await page.reload();
    await expect(page.getByText("no-path", { exact: true })).toBeVisible();
    await expectNotes(page, isMobile, "Saved elsewhere");
    const second = await page.context().newPage();
    await second.goto(`/runs/${other.id}`);
    await expectNotes(second, isMobile, "");
    await expect(
      second.getByRole("button", { name: "Yes", exact: true }),
    ).toBeVisible();
    await second.close();
  } finally {
    for (const id of [r.id, other.id])
      await page.request.delete(`/api/v1/runs/${id}`, {
        headers: { Origin: origin },
      });
    await page.request
      .delete(`/api/v1/scripts/${s.id}`, {
        headers: { Origin: origin },
        timeout: 3000,
      })
      .catch(() => {});
  }
});

test("failed note write recovers from IndexedDB and deletion cannot be resurrected", async ({
  page,
  isMobile,
}) => {
  await login(page);
  const s = await create(page, fixtures[0].definition),
    r = await start(page, s);
  try {
    await page.goto(`/runs/${r.id}`);
    await page.route(
      `**/api/v1/runs/${r.id}/state`,
      (route) => route.abort("failed"),
      { times: 1 },
    );
    await notes(page, isMobile, "Recovered after interruption.");
    await expect(page.locator(".sync-status").getByRole("alert")).toBeVisible();
    await page.reload();
    await expectNotes(page, isMobile, "Recovered after interruption.");
    await expect
      .poll(
        async () =>
          (await request<Run>(page.request, "GET", `/runs/${r.id}`)).callNotes,
      )
      .toBe("Recovered after interruption.");
    // A retry can reach the server immediately before reload discards its reply.
    // Resolve that legitimate recovery conflict before testing a later deletion.
    const acknowledged = page.getByText("All changes saved", { exact: true });
    const recoveredConflict = page.getByRole("button", {
      name: "Load saved version",
      exact: true,
    });
    await expect(acknowledged.or(recoveredConflict)).toBeVisible();
    if (await recoveredConflict.isVisible()) await recoveredConflict.click();
    await expect(acknowledged).toBeVisible();
    await request(page.request, "DELETE", `/runs/${r.id}`);
    await notes(page, isMobile, "A stale edit");
    await expect(
      page.getByText(
        "This record was deleted. The pending copy cannot recreate it.",
        { exact: true },
      ),
    ).toBeVisible();
    const response = await page.request.get(`/api/v1/runs/${r.id}`);
    expect(response.status()).toBe(404);
  } finally {
    await page.request.delete(`/api/v1/runs/${r.id}`, {
      headers: { Origin: origin },
    });
    await page.request
      .delete(`/api/v1/scripts/${s.id}`, {
        headers: { Origin: origin },
        timeout: 3000,
      })
      .catch(() => {});
  }
});

test("editor conflict retains the local graph until explicit replacement", async ({
  page,
}) => {
  await login(page);
  const s = await create(page, fixtures[0].definition);
  try {
    await page.goto(`/scripts/${s.id}`);
    await expect(page.getByLabel("Script name", { exact: true })).toHaveValue(
      s.name,
    );
    await request(page.request, "PUT", `/scripts/${s.id}`, {
      name: "Agent revision",
      definition: fixtures[0].definition,
      expectedRevision: s.revision,
    });
    await page
      .getByLabel("Script name", { exact: true })
      .fill("Local revision");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Review conflicting versions" }),
    ).toBeVisible();
    expect(
      (await request<Script>(page.request, "GET", `/scripts/${s.id}`)).name,
    ).toBe("Agent revision");
    await page
      .getByRole("button", {
        name: "Apply local draft to latest revision",
        exact: true,
      })
      .click();
    await expect
      .poll(
        async () =>
          (await request<Script>(page.request, "GET", `/scripts/${s.id}`)).name,
      )
      .toBe("Local revision");
    await page.reload();
    await expect(page.getByLabel("Script name", { exact: true })).toHaveValue(
      "Local revision",
    );
  } finally {
    await page.request
      .delete(`/api/v1/scripts/${s.id}`, {
        headers: { Origin: origin },
        timeout: 3000,
      })
      .catch(() => {});
  }
});

test("login protects docs and downloads, and core screens have no AA violations", async ({
  page,
  playwright,
}, info) => {
  const publicClient = await playwright.request.newContext({ baseURL: origin });
  try {
    for (const path of [
      "/api/v1/scripts",
      "/api/v1/runs",
      "/api/v1/docs/mcp-config",
      "/api/v1/docs/script-schema",
      "/api/v1/docs/mcp-downloads/linux-amd64",
    ])
      expect((await publicClient.get(path)).status()).toBe(401);
  } finally {
    await publicClient.dispose();
  }
  await page.goto("/docs");
  await expect(page).toHaveURL(/\/login\?next=/);
  await snapshot(page, info, "login");
  await page
    .getByLabel("Password", { exact: false })
    .fill(process.env.TEST_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(
    page.getByText(
      "The configuration download contains your deployment API key.",
      { exact: true },
    ),
  ).toBeVisible();
  for (const path of ["/docs", "/scripts", "/runs"]) {
    await page.goto(path);
    await expect(page.locator("#main")).toBeVisible();
    if (path === "/docs") await snapshot(page, info, "documentation");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(a.violations).toEqual([]);
  }
  if (info.project.name === "chromium") {
    for (const platform of [
      "darwin-amd64",
      "darwin-arm64",
      "linux-amd64",
      "linux-arm64",
      "windows-amd64",
    ]) {
      const response = await page.request.get(
        `/api/v1/docs/mcp-downloads/${platform}`,
        { headers: { Range: "bytes=0-3" } },
      );
      expect(response.status()).toBe(206);
      expect((await response.body()).length).toBe(4);
      expect(response.headers()["cache-control"]).toBe("no-store");
    }
    const config = await page.request.get("/api/v1/docs/mcp-config");
    expect(config.headers()["cache-control"]).toBe("no-store");
    const body = await config.json();
    expect(
      Boolean(body.mcpServers["call-coach"].env.CALL_COACH_API_KEY),
    ).toBeTruthy();
    expect(
      (await page.content()).includes(
        body.mcpServers["call-coach"].env.CALL_COACH_API_KEY,
      ),
    ).toBe(false);
  }
});

test("duplicate, sort, and delete controls preserve other runs and script identity filters", async ({
  page,
}) => {
  await login(page);
  const source = await create(page, fixtures[0].definition);
  const sourceName = `Zzz ${crypto.randomUUID().slice(0, 8)}`;
  await request(page.request, "PUT", `/scripts/${source.id}`, {
    name: sourceName,
    definition: source.definition,
    expectedRevision: source.revision,
  });
  const current = await request<Script>(
    page.request,
    "GET",
    `/scripts/${source.id}`,
  );
  const first = await start(page, current);
  const second = await request<Run>(page.request, "POST", "/runs", {
    scriptId: current.id,
    expectedScriptRevision: current.revision,
    lead: { name: "Second Sample", company: "Sample", phone: "local" },
    clientRequestId: crypto.randomUUID(),
  });
  let duplicateId = "";
  try {
    await page.goto("/scripts");
    await page
      .getByRole("button", { name: `Duplicate ${sourceName}`, exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Duplicate script",
      exact: true,
    });
    const name = `Aaaa ${crypto.randomUUID().slice(0, 8)}`;
    await dialog.getByLabel("Script name").fill(name);
    await dialog
      .getByRole("button", { name: "Create duplicate", exact: true })
      .click();
    await page.waitForURL(/\/scripts\/[a-f0-9-]+$/);
    duplicateId = page.url().split("/").pop()!;
    const duplicate = await request<Script>(
      page.request,
      "GET",
      `/scripts/${duplicateId}`,
    );
    expect(duplicate.lastExecutedAt).toBeNull();
    expect(duplicate.revision).toBe(1);
    expect(duplicate.definition).toEqual(source.definition);
    await page.goto("/scripts");
    await page
      .getByLabel("Sort scripts", { exact: true })
      .selectOption("name-desc");
    await expect
      .poll(async () => {
        const names = await page
          .locator("tbody .script-name")
          .allTextContents();
        return (
          names.indexOf(sourceName) >= 0 &&
          names.indexOf(name) > names.indexOf(sourceName)
        );
      })
      .toBe(true);
    await page.goto(`/runs?scriptId=${source.id}`);
    await page
      .getByRole("button", {
        name: "Delete call with Alex Sample",
        exact: true,
      })
      .click();
    const deletion = page.getByRole("dialog", {
      name: "Delete this run?",
      exact: true,
    });
    await deletion
      .getByRole("button", { name: "Delete run", exact: true })
      .click();
    await expect(page.getByText("Alex Sample", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Second Sample", { exact: true }),
    ).toBeVisible();
    await page.goto("/scripts");
    await page
      .getByRole("button", { name: `Delete ${sourceName}`, exact: true })
      .click();
    const removeScript = page.getByRole("dialog", {
      name: "Delete this script?",
      exact: true,
    });
    await expect(
      removeScript.getByText(
        "Existing active and completed runs remain available.",
        { exact: false },
      ),
    ).toBeVisible();
    await removeScript
      .getByRole("button", { name: "Delete script", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: sourceName, exact: true }),
    ).toHaveCount(0);
    await page.goto(`/runs?scriptId=${source.id}`);
    await expect(
      page.getByRole("option", { name: sourceName, exact: true }),
    ).toBeAttached();
    await expect(
      page.getByText("Second Sample", { exact: true }),
    ).toBeVisible();
    expect(
      (await request<Run>(page.request, "GET", `/runs/${second.id}`)).phase,
    ).toBe("in_progress");
  } finally {
    for (const id of [first.id, second.id])
      await page.request
        .delete(`/api/v1/runs/${id}`, {
          headers: { Origin: origin },
          timeout: 3000,
        })
        .catch(() => {});
    for (const id of [source.id, duplicateId].filter(Boolean))
      await page.request
        .delete(`/api/v1/scripts/${id}`, {
          headers: { Origin: origin },
          timeout: 3000,
        })
        .catch(() => {});
  }
});

test("schema errors can be corrected and unavailable local storage never hides server saves", async ({
  page,
  isMobile,
}) => {
  await login(page);
  const s = await create(page, fixtures[0].definition);
  let runId = "";
  try {
    await page.goto(`/scripts/${s.id}`);
    await expect(page.getByLabel("Script name", { exact: true })).toHaveValue(
      s.name,
    );
    await page.getByLabel("Script name", { exact: true }).fill("");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a script name" }),
    ).toBeVisible();
    await page
      .getByLabel("Script name", { exact: true })
      .fill("Corrected name");
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    const saved = await request<Script>(
      page.request,
      "GET",
      `/scripts/${s.id}`,
    );
    expect(saved.name).toBe("Corrected name");
    const r = await start(page, saved);
    runId = r.id;
    await page.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", {
        configurable: true,
        value: {
          open: () => {
            throw new DOMException("Storage unavailable", "InvalidStateError");
          },
        },
      });
    });
    await page.goto(`/runs/${r.id}`);
    await expect(
      page.getByText("Local recovery storage is unavailable.", {
        exact: false,
      }),
    ).toBeVisible();
    await notes(page, isMobile, "Saved despite unavailable local storage.");
    await expect
      .poll(
        async () =>
          (await request<Run>(page.request, "GET", `/runs/${r.id}`)).callNotes,
      )
      .toBe("Saved despite unavailable local storage.");
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expectNotes(
      page,
      isMobile,
      "Saved despite unavailable local storage.",
    );
  } finally {
    if (runId)
      await page.request
        .delete(`/api/v1/runs/${runId}`, {
          headers: { Origin: origin },
          timeout: 3000,
        })
        .catch(() => {});
    await page.request
      .delete(`/api/v1/scripts/${s.id}`, {
        headers: { Origin: origin },
        timeout: 3000,
      })
      .catch(() => {});
  }
});

test("saved invalid graphs block calls while tests stop at the encountered second node", async ({
  page,
}) => {
  await login(page);
  const invalid = structuredClone(fixtures[1].definition);
  const switchNode = invalid.nodes.find((n) => n.type === "switch");
  if (switchNode?.type === "switch") switchNode.options[0].target = null;
  const s = await create(page, invalid);
  try {
    await page.goto(`/scripts/${s.id}`);
    const node = page.getByRole("article", {
      name: "Switch workflow node",
      exact: true,
    });
    await expect(node).toBeVisible();
    // Measure selection layout after the web font has established toolbar height.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const canvasBefore = (await page
      .locator(".workflow-canvas")
      .boundingBox())!;
    await node.click();
    await expect(
      page.getByRole("group", { name: "Selected node actions", exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(async () => {
        const box = (await page.locator(".workflow-canvas").boundingBox())!;
        return { y: box.y, height: box.height };
      })
      .toEqual({ y: canvasBefore.y, height: canvasBefore.height });
    await node.getByRole("button", { name: "Edit node", exact: true }).click();
    const edit = page.getByRole("dialog", { name: "Edit switch", exact: true });
    await edit
      .getByLabel("Switch name", { exact: true })
      .fill("Is the timing right?");
    await edit.getByLabel("Option 1 label", { exact: true }).fill("Ready");
    await expect(edit.getByRole("combobox")).toHaveCount(0);
    await edit.getByRole("button", { name: "Add option", exact: true }).click();
    await edit
      .getByRole("button", { name: "Remove option 3", exact: true })
      .click();
    await edit
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    const intro = page
      .getByRole("article", {
        name: "Talking point workflow node",
        exact: true,
      })
      .filter({ has: page.getByText("a", { exact: true }) });
    await intro.click();
    await page.getByRole("button", { name: "Test a", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Test conversation", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("a", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Connect the Ready option to a node." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Close test", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Start call", exact: true }),
    ).toBeDisabled();
    const saved = await request<Script>(
      page.request,
      "GET",
      `/scripts/${s.id}`,
    );
    const decision = saved.definition.nodes.find((n) => n.id === "s");
    expect(decision?.type).toBe("switch");
    if (decision?.type === "switch") {
      expect(decision.options.map((o) => o.id)).toEqual(["yes", "no"]);
      expect(decision.options[0].label).toBe("Ready");
    }
    expect(
      saved.validation.some((e) => e.code === "MISSING_OPTION_TARGET"),
    ).toBeTruthy();
    expect(saved.lastExecutedAt).toBeNull();
    expect(
      (
        await request<{ total: number }>(
          page.request,
          "GET",
          `/runs?scriptId=${s.id}`,
        )
      ).total,
    ).toBe(0);
    const attempt = await page.request.post("/api/v1/runs", {
      headers: { Origin: origin },
      data: {
        scriptId: s.id,
        expectedScriptRevision: saved.revision,
        lead: { name: "Example", company: "Sample", phone: "local" },
        clientRequestId: crypto.randomUUID(),
      },
    });
    expect(attempt.status()).toBe(422);
  } finally {
    await page.request
      .delete(`/api/v1/scripts/${s.id}`, {
        headers: { Origin: origin },
        timeout: 3000,
      })
      .catch(() => {});
  }
});

test("canvas handles connect nodes by drag or tap without connection dropdowns", async ({
  page,
  isMobile,
}) => {
  await login(page);
  const script = await create(page, {
    schemaVersion: 1,
    nodes: [
      {
        id: "opening",
        type: "talking_point",
        isStart: true,
        text: "Opening",
        next: null,
      },
      {
        id: "followup",
        type: "talking_point",
        isStart: false,
        text: "Follow up",
        next: null,
      },
    ],
    layout: {
      positions: { opening: { x: 0, y: 0 }, followup: { x: 400, y: 0 } },
    },
  });
  try {
    await page.goto(`/scripts/${script.id}`);
    const from = page
      .getByRole("article", {
        name: "Talking point workflow node",
        exact: true,
      })
      .filter({ hasText: "Opening" });
    const to = page.getByRole("button", {
      name: "Incoming connection to Follow up",
      exact: true,
    });
    const outgoing = from.getByRole("button", {
      name: "Add next node",
      exact: true,
    });
    await expect(outgoing).toBeVisible();
    await expect(from.locator(".react-flow__handle.source")).toHaveCount(1);
    await expect(outgoing).toHaveClass(/react-flow__handle/);
    await expect(outgoing.locator("svg")).toHaveCount(1);
    await page.getByRole("button", { name: "Fit View", exact: true }).click();
    if (isMobile) {
      await outgoing.tap();
      await page
        .getByRole("dialog", { name: "Add next node", exact: true })
        .getByRole("button", { name: "Connect to existing node", exact: true })
        .tap();
      await to.tap();
    } else {
      await outgoing.hover();
      const a = (await outgoing.boundingBox())!,
        b = (await to.boundingBox())!;
      // Moving away and back to the same handle is a cancelled drag, not a click.
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(a.x + a.width / 2 + 50, a.y + a.height / 2 + 40, {
        steps: 8,
      });
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2, {
        steps: 8,
      });
      await page.mouse.up();
      await expect(
        page.getByRole("dialog", { name: "Add next node", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator(".react-flow__edge")).toHaveCount(0);
      await outgoing.click();
      const picker = page.getByRole("dialog", {
        name: "Add next node",
        exact: true,
      });
      await expect(picker).toBeVisible();
      await picker.press("Escape");
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
        steps: 15,
      });
      await page.mouse.up();
    }
    await expect(
      page.getByRole("dialog", { name: "Add next node", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    const saved = await request<Script>(
      page.request,
      "GET",
      `/scripts/${script.id}`,
    );
    const node = saved.definition.nodes.find((n) => n.id === "opening");
    expect(node?.type === "talking_point" && node.next).toBe("followup");
    await page.reload();
    await expect(page.locator(".react-flow__edge")).toHaveCount(1);
    await from.getByRole("button", { name: "Edit node", exact: true }).click();
    const edit = page.getByRole("dialog", {
      name: "Edit talking point",
      exact: true,
    });
    await expect(edit.getByRole("combobox")).toHaveCount(0);
    await edit.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add question", exact: true }),
    ).toHaveCount(0);
  } finally {
    await page.request.delete(`/api/v1/scripts/${script.id}`, {
      headers: { Origin: origin },
    });
  }
});

test("handle popover inserts and connects the selected node type and switch branch", async ({
  page,
}, info) => {
  await login(page);
  const script = await create(page, {
    schemaVersion: 1,
    nodes: [
      {
        id: "opening",
        type: "talking_point",
        isStart: true,
        text: "Opening",
        next: "end",
      },
      {
        id: "end",
        type: "talking_point",
        isStart: false,
        text: "Existing end",
        next: null,
      },
    ],
    layout: { positions: { opening: { x: 0, y: 0 }, end: { x: 380, y: 0 } } },
  });
  const source = page
    .getByRole("article", { name: "Talking point workflow node", exact: true })
    .filter({ hasText: "Opening" });
  const picker = page.getByRole("dialog", {
    name: "Add next node",
    exact: true,
  });
  try {
    await page.goto(`/scripts/${script.id}`);
    const add = source.getByRole("button", {
      name: "Add next node",
      exact: true,
    });
    await add.click();
    await expect(picker).toBeVisible();
    const box = (await picker.boundingBox())!,
      viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await snapshot(page, info, "node-add");
    expect(
      (
        await new AxeBuilder({ page })
          .include(".node-add-popover")
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await picker.press("Escape");
    await expect(picker).toHaveCount(0);
    await expect(add).toBeFocused();
    await add.click();
    await page.getByLabel("Script name", { exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(
      page.getByRole("article", {
        name: "Talking point workflow node",
        exact: true,
      }),
    ).toHaveCount(2);
    await add.press("Enter");
    await picker
      .getByRole("button", { name: "Talking point", exact: true })
      .click();
    let edit = page.getByRole("dialog", {
      name: "Edit talking point",
      exact: true,
    });
    await edit.getByLabel("Node text").fill("Inserted talking point");
    await edit
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    const inserted = page
      .getByRole("article", {
        name: "Talking point workflow node",
        exact: true,
      })
      .filter({ hasText: "Inserted talking point" });
    await expect(page.locator(".react-flow__edge")).toHaveCount(2);
    // The same plus-shaped handle opens the picker for each outgoing port.
    await inserted
      .getByRole("button", { name: "Add next node", exact: true })
      .click();
    await picker.getByRole("button", { name: "Switch", exact: true }).click();
    edit = page.getByRole("dialog", { name: "Edit switch", exact: true });
    await edit.getByLabel("Switch name", { exact: true }).fill("Routing");
    await edit
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    const branch = page.getByRole("article", {
      name: "Switch workflow node",
      exact: true,
    });
    await branch
      .getByRole("button", { name: "Add node for Option two", exact: true })
      .click();
    await expect(
      picker.getByRole("button", { name: "Switch", exact: true }),
    ).toBeDisabled();
    await picker
      .getByRole("button", { name: "Talking point", exact: true })
      .click();
    edit = page.getByRole("dialog", {
      name: "Edit talking point",
      exact: true,
    });
    await edit.getByLabel("Node text").fill("Other path");
    await edit
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    const saved = await request<Script>(
      page.request,
      "GET",
      `/scripts/${script.id}`,
    );
    expect(saved.runnable).toBe(true);
    expect(saved.definition.nodes).toHaveLength(5);
    const opening = saved.definition.nodes.find((n) => n.id === "opening");
    const middle = saved.definition.nodes.find(
      (n) => n.type === "talking_point" && n.text === "Inserted talking point",
    );
    const routing = saved.definition.nodes.find((n) => n.type === "switch");
    const other = saved.definition.nodes.find(
      (n) => n.type === "talking_point" && n.text === "Other path",
    );
    expect(opening?.type === "talking_point" && opening.next).toBe(middle?.id);
    expect(middle?.type === "talking_point" && middle.next).toBe(routing?.id);
    expect(
      routing?.type === "switch" && routing.options.map((o) => o.target),
    ).toEqual(["end", other?.id]);
    expect(saved.definition.layout?.positions[middle!.id]).not.toEqual(
      saved.definition.layout?.positions.end,
    );
    await page.reload();
    await expect(page.locator(".react-flow__edge")).toHaveCount(4);
    await expect(page.getByText("Other path", { exact: true })).toBeVisible();
  } finally {
    await page.request.delete(`/api/v1/scripts/${script.id}`, {
      headers: { Origin: origin },
    });
  }
});

test("dragging nodes keeps the graph visible and persists the final position", async ({
  page,
}, info) => {
  await login(page);
  const script = await create(page, {
    schemaVersion: 1,
    nodes: [
      {
        id: "a",
        type: "talking_point",
        isStart: true,
        text: "Opening",
        next: "b",
      },
      {
        id: "b",
        type: "talking_point",
        isStart: false,
        text: "Move this node",
        next: "c",
      },
      {
        id: "c",
        type: "talking_point",
        isStart: false,
        text: "Closing",
        next: null,
      },
    ],
    layout: {
      positions: {
        a: { x: 0, y: 0 },
        b: { x: 360, y: 0 },
        c: { x: 720, y: 0 },
      },
    },
  });
  try {
    await page.goto(`/scripts/${script.id}`);
    const nodes = page.locator(".react-flow__node");
    const moving = page.locator('.react-flow__node[data-id="b"]');
    await expect(nodes).toHaveCount(3);
    for (const n of await nodes.all()) await expect(n).toBeVisible();
    await expect(page.locator(".react-flow__edge")).toHaveCount(2);
    await moving.locator(".editor-node-heading").hover();
    const viewport = await page
      .locator(".react-flow__viewport")
      .getAttribute("style");
    await page.evaluate(() => {
      const state = window as typeof window & {
        dragSamples?: { nodes: number; visible: boolean; edges: number }[];
        stopDragRecording?: () => void;
      };
      state.dragSamples = [];
      let running = true;
      state.stopDragRecording = () => {
        running = false;
      };
      const record = () => {
        if (!running) return;
        const nodes = [
          ...document.querySelectorAll<HTMLElement>(".react-flow__node"),
        ];
        state.dragSamples!.push({
          nodes: nodes.length,
          visible: nodes.every((n) => {
            const style = getComputedStyle(n),
              box = n.getBoundingClientRect();
            return (
              style.visibility === "visible" &&
              style.display !== "none" &&
              Number(style.opacity) > 0 &&
              box.width > 0 &&
              box.height > 0
            );
          }),
          edges: document.querySelectorAll(".react-flow__edge").length,
        });
        requestAnimationFrame(record);
      };
      requestAnimationFrame(record);
    });
    for (const delta of [
      { x: -20, y: 28 },
      { x: 32, y: -12 },
      { x: -12, y: 20 },
    ]) {
      const box = (await moving.locator(".editor-node-heading").boundingBox())!;
      expect(box).toBeTruthy();
      const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (let step = 1; step <= 10; step++) {
        await page.mouse.move(
          start.x + (delta.x * step) / 10,
          start.y + (delta.y * step) / 10,
        );
        await page.evaluate(
          () => new Promise<void>((r) => requestAnimationFrame(() => r())),
        );
      }
      await page.mouse.up();
      for (const n of await nodes.all()) await expect(n).toBeVisible();
      await expect(page.locator(".react-flow__edge")).toHaveCount(2);
      expect(
        await page.locator(".react-flow__viewport").getAttribute("style"),
      ).toBe(viewport);
    }
    const samples = await page.evaluate(() => {
      const state = window as typeof window & {
        dragSamples: { nodes: number; visible: boolean; edges: number }[];
        stopDragRecording: () => void;
      };
      state.stopDragRecording();
      return state.dragSamples;
    });
    expect(samples.length).toBeGreaterThan(10);
    expect(
      samples
        .filter((s) => s.nodes !== 3 || !s.visible || s.edges !== 2)
        .slice(0, 3),
    ).toEqual([]);
    const beforeKey = await moving.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41,
    );
    await moving.press("ArrowRight");
    await expect
      .poll(() =>
        moving.evaluate(
          (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m41,
        ),
      )
      .toBeCloseTo(beforeKey + 5, 3);
    await page.getByRole("button", { name: "Save now", exact: true }).click();
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    const saved = await request<Script>(
      page.request,
      "GET",
      `/scripts/${script.id}`,
    );
    expect(saved.definition.layout?.positions.a).toEqual({ x: 0, y: 0 });
    expect(saved.definition.layout?.positions.c).toEqual({ x: 720, y: 0 });
    const position = saved.definition.layout!.positions.b;
    expect(position).not.toEqual({ x: 360, y: 0 });
    expect(position.x).toBeCloseTo(beforeKey + 5, 3);
    // Autosave acknowledgement must not clear measurements either.
    for (const n of await nodes.all()) await expect(n).toBeVisible();
    await snapshot(page, info, "dragged-editor");
    await page.reload();
    await expect(moving).toBeVisible();
    await expect(page.locator(".react-flow__edge")).toHaveCount(2);
    const restored = await moving.evaluate((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return { x: m.m41, y: m.m42 };
    });
    expect(restored.x).toBeCloseTo(position.x, 3);
    expect(restored.y).toBeCloseTo(position.y, 3);
  } finally {
    await page.mouse.up().catch(() => {});
    await page.request.delete(`/api/v1/scripts/${script.id}`, {
      headers: { Origin: origin },
    });
  }
});
