import {
  expect,
  type Page,
  type Locator,
  type APIRequestContext,
} from "@playwright/test";
export const origin = process.env.BASE_URL || "http://127.0.0.1:3000";
export async function expectSingleControlDivider(conversation: Locator) {
  const cards = conversation.locator(".conversation-card");
  await expect(cards.last()).toBeVisible();
  await expect(cards.last()).toHaveCSS("border-bottom-width", "0px");
  await expect(conversation.locator(".conversation-controls")).toHaveCSS(
    "border-top-width",
    "1px",
  );
  for (let i = 0; i < (await cards.count()) - 1; i++) {
    await expect(cards.nth(i)).toHaveCSS("border-bottom-width", "1px");
  }
}
export async function login(page: Page) {
  const password = process.env.TEST_PASSWORD;
  if (!password)
    throw new Error("Set TEST_PASSWORD or use scripts/test-compose.sh.");
  const response = await page.request.post("/api/v1/auth/login", {
    data: { password },
    headers: { Origin: origin },
  });
  expect(response.status()).toBe(200);
}
export async function request<T>(
  client: APIRequestContext,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await client.fetch(`/api/v1${path}`, {
    method,
    headers: { Origin: origin },
    data: body,
  });
  expect(
    response.ok(),
    `API ${method} ${path} status ${response.status()}`,
  ).toBeTruthy();
  return response.json();
}
export async function notes(page: Page, isMobile: boolean, value: string) {
  if (isMobile) {
    await page.getByRole("button", { name: /^Open notes/ }).click();
    const panel = page.getByRole("dialog", { name: "Notes", exact: true });
    await panel.getByLabel("Call notes", { exact: true }).fill(value);
    await panel
      .getByRole("button", { name: "Close Notes", exact: true })
      .click();
  } else
    await page.getByRole("textbox", { name: "Notes", exact: true }).fill(value);
}
export async function expectNotes(
  page: Page,
  isMobile: boolean,
  value: string,
) {
  if (isMobile) {
    await page.getByRole("button", { name: /^Open notes/ }).click();
    const panel = page.getByRole("dialog", { name: "Notes", exact: true });
    await expect(panel.getByLabel("Call notes", { exact: true })).toHaveValue(
      value,
    );
    await panel
      .getByRole("button", { name: "Close Notes", exact: true })
      .click();
  } else
    await expect(
      page.getByRole("textbox", { name: "Notes", exact: true }),
    ).toHaveValue(value);
}
