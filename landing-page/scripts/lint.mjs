// Static checks for the hand-written HTML: document basics, unique IDs, resolvable
// internal links and fragments, and no third-party resources.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "src");
const pages = (await readdir(src)).filter((file) => file.endsWith(".html"));
const problems = [];
const ids = new Map();

for (const page of pages) {
  const html = await readFile(path.join(src, page), "utf8");
  const pageIds = [...html.matchAll(/\sid="([^"]+)"/g)].map(
    (match) => match[1],
  );
  ids.set(page, new Set(pageIds));
  const duplicate = pageIds.find((id, index) => pageIds.indexOf(id) !== index);
  if (duplicate) problems.push(`${page}: duplicate id "${duplicate}"`);
  if (!/<html lang="de">/.test(html))
    problems.push(`${page}: missing <html lang="de">`);
  if (!/<title>[^<]+<\/title>/.test(html))
    problems.push(`${page}: missing <title>`);
  if (!/<meta\s+name="description"\s+content="[^"]+"/.test(html))
    problems.push(`${page}: missing meta description`);
  if ((html.match(/<h1[\s>]/g) || []).length !== 1)
    problems.push(`${page}: needs one <h1>`);
  if (!/<main id="inhalt"/.test(html))
    problems.push(`${page}: missing <main id="inhalt">`);
  if (/<script[\s>]/.test(html))
    problems.push(`${page}: scripts are not allowed (CSP)`);
  if (/\sstyle="/.test(html))
    problems.push(`${page}: inline styles are not allowed (CSP)`);
  for (const [, tag] of html.matchAll(/<img\b([^>]*)>/g)) {
    if (!/\salt="/.test(tag)) problems.push(`${page}: <img> without alt`);
  }
  for (const [, url] of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(url))
      problems.push(`${page}: external resource ${url}`);
  }
}

const routes = new Map(
  pages.map((page) => [
    page === "index.html" ? "/" : `/${page.replace(/\.html$/, "")}`,
    page,
  ]),
);
for (const page of pages) {
  const html = await readFile(path.join(src, page), "utf8");
  for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
    if (href.startsWith("mailto:") || href === "__CALL_COACH_APP_URL__")
      continue;
    const [target, fragment] = href.split("#");
    const targetPage = target === "" ? page : routes.get(target);
    if (!targetPage) {
      const isAsset =
        target.startsWith("/assets/") ||
        target.startsWith("/styles.css") ||
        target.startsWith("/fonts/");
      if (!isAsset) problems.push(`${page}: unknown link ${href}`);
      continue;
    }
    if (fragment && !ids.get(targetPage).has(fragment))
      problems.push(`${page}: missing fragment ${href}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`HTML checks passed for ${pages.length} pages.`);
