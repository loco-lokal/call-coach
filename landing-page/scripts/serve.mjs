// Dependency-free static server for development and tests.
// It mirrors the production nginx behaviour: clean URLs, a 404 page, security headers
// and replacement of __CALL_COACH_APP_URL__ with CALL_COACH_APP_URL in HTML responses.
//   node scripts/serve.mjs            serves dist/ (run `npm run build` first)
//   node scripts/serve.mjs --source   serves src/ and fonts from node_modules
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceMode = process.argv.includes("--source");
const siteDir = path.join(root, sourceMode ? "src" : "dist");
const fontDir = path.join(
  root,
  "node_modules/@fontsource-variable/manrope/files",
);
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const appUrl = process.env.CALL_COACH_APP_URL || "http://127.0.0.1:3000";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const headers = {
  "Content-Security-Policy":
    "default-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

async function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  if (sourceMode && decoded.startsWith("/fonts/")) {
    return path.join(fontDir, path.basename(decoded));
  }
  const candidates = decoded.endsWith("/")
    ? [`${decoded}index.html`]
    : [decoded, `${decoded}.html`];
  for (const candidate of candidates) {
    const file = path.join(siteDir, path.normalize(candidate));
    if (!file.startsWith(siteDir + path.sep)) return null;
    try {
      if ((await stat(file)).isFile()) return file;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

async function send(res, status, file, method) {
  const ext = path.extname(file);
  let body = await readFile(file);
  if (ext === ".html") {
    body = Buffer.from(
      body.toString("utf8").replaceAll("__CALL_COACH_APP_URL__", appUrl),
    );
  }
  res.writeHead(status, {
    ...headers,
    "Content-Type": types[ext] || "application/octet-stream",
    "Content-Length": body.length,
  });
  res.end(method === "HEAD" ? undefined : body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    const { pathname } = new URL(req.url, "http://localhost");
    if (pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
      return;
    }
    const file = await resolveFile(pathname);
    if (file) await send(res, 200, file, req.method);
    else await send(res, 404, path.join(siteDir, "404.html"), req.method);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500).end();
  }
}).listen(port, host, () => {
  console.log(
    `Landing page (${sourceMode ? "src" : "dist"}) on http://${host}:${port}`,
  );
});
