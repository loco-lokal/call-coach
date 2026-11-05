import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { appUrl } from "../playwright.config";

const pages = [
  { path: "/", heading: /Der nächste Gesprächspunkt ist schon da/ },
  { path: "/impressum", heading: "Impressum" },
  { path: "/datenschutz", heading: "Datenschutzerklärung" },
];

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const { path, heading } of pages) {
  test(`${path} renders accessibly`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expectNoHorizontalOverflow(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("serves the Manrope font locally", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith("data:")) external.push(url);
  });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check('16px "Manrope Variable"')),
  ).toBe(true);
  expect(external).toEqual([]);
});

test("every call to action leads to the configured application", async ({
  page,
}) => {
  await page.goto("/");
  const ctas = page.getByRole("link", { name: "Call Coach öffnen" });
  await expect(ctas).toHaveCount(3);
  for (const cta of await ctas.all())
    await expect(cta).toHaveAttribute("href", appUrl);
  await expect(page.locator('a[href*="__CALL_COACH_APP_URL__"]')).toHaveCount(
    0,
  );
});

test("in-page navigation reaches each section", async ({ page }) => {
  await page.goto("/");
  for (const [name, id] of [
    ["Vorteile", "vorteile"],
    ["Ablauf", "ablauf"],
    ["Leitfäden & MCP", "leitfaeden"],
    ["Umfang", "umfang"],
  ]) {
    const link = page
      .getByRole("navigation", { name: "Hauptnavigation" })
      .getByRole("link", { name });
    await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`#${id}`)).toBeInViewport();
  }
});

test("does not promise unsupported capabilities", async ({ page }) => {
  await page.goto("/");
  const unsupported =
    /\b(Aufzeichnung|Transkription|Telefonie|CRM|Suche|Dashboards?|Analyse|Einzelkonten)\b/;
  const columns = page.locator(".scope__column");
  await expect(columns).toHaveCount(2);
  await expect(columns.nth(0).getByRole("heading")).toHaveText("Enthalten");
  await expect(columns.nth(0)).not.toContainText(unsupported);
  const excluded = columns.nth(1);
  await expect(excluded.getByRole("heading")).toHaveText("Nicht enthalten");
  for (const item of [
    "Keine Gesprächsaufzeichnung und keine Transkription",
    "Keine Telefonie und keine CRM-Anbindung",
    "Keine Suche in der Leitfadenbibliothek",
    "Keine Auswertungs-Dashboards",
    "Keine Einzelkonten",
  ])
    await expect(excluded).toContainText(item);
  // Outside the "Nicht enthalten" list, the page never mentions these capabilities.
  const elsewhere = await page.evaluate(() => {
    const main = document.querySelector("main")!.cloneNode(true) as HTMLElement;
    main.querySelector(".scope__column--out")!.remove();
    return main.textContent || "";
  });
  expect(elsewhere).not.toMatch(unsupported);
  await expect(page.locator("form")).toHaveCount(0);
});

test("legal pages are reachable from the footer and contain the operator", async ({
  page,
}) => {
  await page.goto("/");
  const legal = page.getByRole("navigation", { name: "Rechtliches" });
  await legal.getByRole("link", { name: "Impressum" }).click();
  await expect(page).toHaveURL(/\/impressum$/);
  const main = page.getByRole("main");
  await expect(main).toContainText("Loco Lokal eGbR");
  await expect(main).toContainText("Johann-Clanze-Strasse 28e");
  await expect(main).toContainText("81369 München");
  await expect(main).toContainText("Vincent Halasz und Tedi Ikonomi");
  await expect(main).toContainText("§\u00a018 Abs.\u00a02 MStV");
  await expect(main).toContainText("Verbraucherschlichtungsstelle");
  await expect(
    main.getByRole("link", { name: "kontakt@loco-lokal.de" }),
  ).toHaveAttribute("href", "mailto:kontakt@loco-lokal.de");
  await expect(legal.getByRole("link", { name: "Impressum" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await legal.getByRole("link", { name: "Datenschutz" }).click();
  await expect(page).toHaveURL(/\/datenschutz$/);
  await expect(page.getByRole("main")).toContainText(
    "Art.\u00a06 Abs.\u00a01 lit.\u00a0f DSGVO",
  );
  await expect(page.getByRole("main")).toContainText("keine Cookies");
});

test("unknown paths return the German 404 page", async ({ page }) => {
  const response = await page.goto("/gibt-es-nicht");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Diese Seite gibt es nicht.",
  );
});

test("sends security headers", async ({ request }) => {
  for (const path of ["/", "/impressum", "/styles.css", "/gibt-es-nicht"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["content-security-policy"]).toBe(
      "default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  }
});

test("directories return 404 instead of listings or redirects", async ({
  request,
}) => {
  for (const path of ["/assets", "/assets/", "/fonts/", "/scripts/"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(404);
  }
});

test("keyboard users can skip to the content and reach the main action", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, "Keyboard navigation is checked on desktop projects.");
  // WebKit only moves focus to links with Tab when "Press Tab to highlight" is enabled.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await page.goto("/");
  await page.keyboard.press(tab);
  const skip = page.getByRole("link", { name: "Zum Inhalt springen" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#inhalt$/);

  await page.goto("/");
  const order: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press(tab);
    order.push(
      await page.evaluate(
        () => document.activeElement?.textContent?.trim() || "",
      ),
    );
  }
  expect(order).toContain("Vorteile");
  expect(order).toContain("Call Coach öffnen");
  const outline = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).outlineStyle,
  );
  expect(outline).toBe("solid");
});

test.describe("motion", () => {
  test("animates the preview only without a reduced-motion preference", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const branch = page.locator(".branch--selected");
    expect(
      await branch.evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("choose");

    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(
      await branch.evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
  });
});

test("captures review screenshots", async ({ page }, testInfo) => {
  test.skip(
    !process.env.SCREENSHOT_DIR,
    "Set SCREENSHOT_DIR to capture screenshots.",
  );
  test.skip(!["chromium", "mobile-chrome"].includes(testInfo.project.name));
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of ["/", "/impressum", "/datenschutz"]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const name = path === "/" ? "landing" : path.slice(1);
    await page.screenshot({
      path: `${process.env.SCREENSHOT_DIR}/${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
});
