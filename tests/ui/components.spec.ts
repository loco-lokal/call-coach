import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import {login, expectSingleControlDivider} from "./helpers";

const evidenceDir = process.env.UI_EVIDENCE_DIR;

test.beforeEach(async ({ page }) => {
  await login(page);
  await page.goto("/components");
});

test("gallery loads without client errors and keeps sample scope explicit", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Less interface. More conversation.",
  );
  await expect(
    page.getByText("All names and records are sample data."),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Component sections" }),
  ).toBeVisible();
  await expect(page.locator(".library-section")).toHaveCount(6);
  expect(errors).toEqual([]);
  if (
    evidenceDir &&
    ["chromium", "mobile-chrome"].includes(testInfo.project.name)
  ) {
    await mkdir(evidenceDir, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    const name = testInfo.project.name === "chromium" ? "desktop" : "mobile";
    await page.screenshot({
      path: `${evidenceDir}/${name}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${evidenceDir}/${name}-viewport.png` });
  }
});

test("conversation selects branches and changes the visible talking point", async ({
  page,
}) => {
  const workspace = page.locator(".call-workspace");
  await expect(workspace.getByRole("article")).toHaveCount(2);
  await expectSingleControlDivider(workspace);
  await expect(
    workspace.getByRole("button", { name: "Go back" }),
  ).toBeDisabled();
  await workspace.getByRole("button", { name: "Next", exact: true }).click();
  await expect(workspace.getByRole("article")).toHaveCount(1);
  await expectSingleControlDivider(workspace);
  const yes = workspace.getByRole("button", { name: "Yes, it’s a challenge" });
  await yes.click();
  await expect(yes).toHaveAttribute("aria-pressed", "true");
  await expect(workspace.getByText(/Let’s explore that/)).toBeVisible();
  await workspace
    .getByRole("button", { name: "Not a priority right now" })
    .click();
  await expect(yes).toHaveAttribute("aria-pressed", "false");
  await expect(workspace.getByText(/That makes sense/)).toBeVisible();
  await expect(workspace.getByText(/Let’s explore that/)).toHaveCount(0);
  await workspace.getByRole("button", { name: "Go back" }).click();
  await expect(
    workspace.getByText(/What happens between a new enquiry/),
  ).toBeVisible();
});

test("notes survive navigating, closing the panel, and rotating a mobile viewport", async ({
  page,
  isMobile,
}) => {
  const workspace = page.locator(".call-workspace");
  if (isMobile) {
    await workspace.getByRole("button", { name: "Open notes" }).click();
    const panel = page.getByRole("dialog", { name: "Notes", exact: true });
    await panel
      .getByLabel("Call notes", { exact: true })
      .fill("Ask about response times.\nFollow up on Friday.");
    await expect(
      panel.getByRole("button", { name: "End call", exact: true }),
    ).toBeVisible();
    // Dismiss text focus before rotating, as when closing a phone's keyboard.
    await panel.getByRole("heading", { name: "Notes", exact: true }).click();
    const size = page.viewportSize()!;
    await page.setViewportSize({ width: size.height, height: size.width });
    await expect(panel.getByLabel("Call notes", { exact: true })).toHaveValue(
      /Friday/,
    );
    await panel.getByRole("button", { name: "Close Notes" }).click();
    await page.setViewportSize(size);
  } else {
    await workspace
      .getByRole("textbox", { name: "Notes", exact: true })
      .fill("Ask about response times.\nFollow up on Friday.");
  }
  await workspace.getByRole("button", { name: "Next", exact: true }).click();
  await workspace
    .getByRole("button", { name: "Yes, it’s a challenge" })
    .click();
  await workspace.getByRole("button", { name: "Go back" }).click();
  if (isMobile) {
    await workspace.getByRole("button", { name: "Open notes" }).click();
    await expect(
      page
        .getByRole("dialog", { name: "Notes", exact: true })
        .getByLabel("Call notes", { exact: true }),
    ).toHaveValue(/Friday/);
  } else {
    await expect(
      workspace.getByRole("textbox", { name: "Notes", exact: true }),
    ).toHaveValue(/Friday/);
  }
});

test("ending requires an explicit outcome and permits blank evaluation notes", async ({
  page,
}) => {
  await page
    .locator(".call-header")
    .getByRole("button", { name: "End call", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "How was the call?" });
  await expect(
    dialog.getByRole("radio", { name: "Success" }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole("radio", { name: "Failure" }),
  ).not.toBeChecked();
  await dialog.getByRole("button", { name: "Complete sample" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Choose Success or Failure to complete the call.",
  );
  await dialog.getByRole("radio", { name: "Success" }).check();
  await dialog.getByRole("button", { name: "Complete sample" }).click();
  await expect(
    dialog.getByRole("heading", { name: "Sample complete" }),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "This was a component preview. No call record was created.",
    ),
  ).toBeVisible();
});

test("lead capture rejects whitespace and accepts a local phone number", async ({
  page,
}) => {
  const section = page.locator("#forms");
  await section.getByLabel("Lead name").fill("   ");
  await section
    .getByRole("button", { name: "Start call", exact: true })
    .click();
  await expect(section.getByLabel("Lead name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(section.getByLabel("Company")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await section.getByLabel("Lead name").fill("  Sam Taylor  ");
  await section.getByLabel("Company").fill("  Sample company  ");
  await section.getByLabel("Phone number").fill("  020 7946 0100  ");
  await section
    .getByRole("button", { name: "Start call", exact: true })
    .click();
  await expect(
    section.getByRole("heading", { name: "Ready for Sam Taylor" }),
  ).toBeVisible();
  await expect(
    section.getByText("Sample company · 020 7946 0100"),
  ).toBeVisible();
});

test("node editor applies text and returns focus to the Edit control", async ({
  page,
}) => {
  const edit = page.getByRole("button", {
    name: "Edit talking point",
    exact: true,
  });
  await edit.click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Talking point",
    exact: true,
  });
  await dialog
    .getByLabel("Node text")
    .fill("A revised introduction.\nKeep this on a second line.");
  await dialog.getByRole("button", { name: "Apply to preview" }).click();
  await expect(
    page.getByRole("article", { name: "Talking point editor node" }),
  ).toContainText("A revised introduction.");
  await expect(edit).toBeFocused();
});

test("testing a selected invalid node shows its error and close control", async ({
  page,
  isMobile,
}, testInfo) => {
  const node = page.getByRole("article", { name: "Switch editor node" });
  // Selection and keyboard focus must stand out from the actual canvas.
  const indicatorContrast = () => node.evaluate((element) => {
    const style = getComputedStyle(element);
    if (style.outlineStyle === "none" || parseFloat(style.outlineWidth) < 2) return 1;
    const channel = (value: number) => {
      const n = value / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color: string) => {
      const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const outline = luminance(style.outlineColor);
    const canvas = luminance(getComputedStyle(element.closest(".node-specimen")!).backgroundColor);
    return (Math.max(outline, canvas) + 0.05) / (Math.min(outline, canvas) + 0.05);
  });
  const capture = evidenceDir && testInfo.project.name === "chromium";
  const originalSize = page.viewportSize()!;
  const viewports = capture ? [originalSize, { width: 680, height: 908 }] : [originalSize];
  if (!isMobile) {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await node.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(node).toBeFocused();
      await expect.poll(indicatorContrast).toBeGreaterThanOrEqual(3);
      if (capture) await page.screenshot({ path: `${evidenceDir}/editor-focus-${viewport.width}.png` });
    }
  }
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await node.click();
    await expect.poll(indicatorContrast).toBeGreaterThanOrEqual(3);
    if (capture) await page.screenshot({ path: `${evidenceDir}/editor-selected-${viewport.width}.png` });
  }
  await page.setViewportSize(originalSize);
  const play = page.getByRole("button", { name: "Test switch", exact: true });
  await expect(play).toBeVisible();
  await play.click();
  const dialog = page.getByRole("dialog", { name: "Test from node" });
  await expect(dialog.getByRole("alert")).toContainText(
    "Connect the Not interested option",
  );
  await dialog.getByRole("button", { name: "Close test", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("invalid scripts explain why Play is disabled and deletion preserves history", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", {
      name: "Start A thoughtful follow-up",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(page.getByText("2 errors · cannot start a call")).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Discovery call", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Delete this script?" });
  await expect(dialog).toContainText("Existing runs remain available.");
  await dialog.getByRole("button", { name: "Keep script" }).click();
  await expect(
    page.getByRole("button", { name: "Delete Discovery call", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Discovery call", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Delete from preview" }).click();
  await expect(
    page.getByRole("button", { name: "Delete Discovery call", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Resume call with Alex Morgan" }),
  ).toBeVisible();
});

test("retry state is honest about the sample and can be reset", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Retry sample" }).click();
  await expect(
    page.getByText("This is a sample state. No server save was attempted."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry sample" }),
  ).toBeVisible();
});

test("responsive workspace keeps the expected layout without page overflow", async ({
  page,
  isMobile,
}) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const conversation = await page.locator(".conversation-area").boundingBox();
  if (isMobile) {
    await expect(page.locator(".desktop-notes")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open notes" }),
    ).toBeVisible();
  } else {
    const notes = await page.locator(".desktop-notes").boundingBox();
    expect(conversation!.width / notes!.width).toBeGreaterThan(1.85);
    expect(conversation!.width / notes!.width).toBeLessThan(2.15);
  }
});

test("keyboard can reach and dismiss an overlay without losing its place", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Keyboard flow is exercised on desktop engines.");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to component library" }),
  ).toBeFocused();
  const edit = page.getByRole("button", {
    name: "Edit talking point",
    exact: true,
  });
  await edit.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Edit Talking point",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBeTruthy();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(edit).toBeFocused();
});

test("gallery and open evaluation have no serious accessibility violations", async ({
  page,
}) => {
  const gallery = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(gallery.violations).toEqual([]);
  await page
    .locator(".call-header")
    .getByRole("button", { name: "End call", exact: true })
    .click();
  const evaluation = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(evaluation.violations).toEqual([]);
});
