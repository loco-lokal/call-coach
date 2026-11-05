# Call Coach landing page

Public, German-language marketing page for Call Coach, with Impressum and Datenschutz. It is a separate project from the authenticated application in the repository root: plain HTML and CSS, no JavaScript, no runtime dependencies, served by unprivileged nginx in its own container.

The site is operated by **Loco Lokal eGbR**. Legal texts are adapted from loco-lokal.de; the privacy notice only covers what this page does (server logs, no cookies, no tracking, no third-party resources, no forms). Review both legal pages whenever the page or its hosting changes.

## Structure

| Path                          | Purpose                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                        | The site: `index.html`, `impressum.html`, `datenschutz.html`, `404.html`, `styles.css`, `assets/` (Call Coach wordmark, favicon).                        |
| `scripts/build.mjs`           | Copies `src/` to `dist/` and adds the Manrope variable font files (Latin, Latin Extended) and their SIL OFL licence from `@fontsource-variable/manrope`. |
| `scripts/serve.mjs`           | Dependency-free static server for development and tests; mirrors nginx (clean URLs, 404 page, security headers, CTA URL substitution).                   |
| `scripts/lint.mjs`            | HTML checks: language, title, description, one `h1`, unique IDs, resolvable links/fragments, no scripts, inline styles or external resources.            |
| `nginx/default.conf.template` | Production server configuration.                                                                                                                         |
| `tests/`                      | Playwright tests including axe accessibility checks, keyboard navigation and reduced motion.                                                             |
| `docs/screenshots/`           | Review screenshots.                                                                                                                                      |

Design tokens follow [DESIGN.md](../DESIGN.md) and `src/styles/tokens.css` of the application: paper, violet-black ink, cobalt, mint green, mist, regular-weight Manrope, broad panel corners and outlined emphasis/actions. Motion is limited to the illustrative call preview and a scroll reveal (where `animation-timeline` is supported) and is disabled under `prefers-reduced-motion: reduce`.

## Application link

Every "Call Coach öffnen" link uses the placeholder `__CALL_COACH_APP_URL__`, which is replaced at response time with `CALL_COACH_APP_URL` (default `http://127.0.0.1:3000`, the local Compose address). Set it to the public origin of your Call Coach deployment. The page links only to the existing application login; there is no signup, demo, pricing or contact workflow.

## Develop, check and test

Requires Node.js 24 (as in the application images).

```sh
cd landing-page
npm ci
npm run dev                      # serves src/ on http://127.0.0.1:4173
npm run lint                     # HTML checks and Prettier
npm run typecheck                # Playwright config and tests
npm run build                    # writes dist/
npm start                        # serves dist/ on http://127.0.0.1:4173
npx playwright install           # once, for Playwright-managed browsers
npm test                         # builds, starts the server and runs all browser projects
```

`PORT`, `HOST` and `CALL_COACH_APP_URL` configure the local server. To use an already installed Chromium for the `chromium` and `mobile-chrome` projects, set `CHROMIUM_EXECUTABLE_PATH`. Set `SCREENSHOT_DIR` to capture full-page screenshots from those two projects.

## Container

```sh
docker build -t call-coach-landing:local landing-page
docker run --rm -p 127.0.0.1:8080:8080 \
  -e CALL_COACH_APP_URL=https://calls.example.com/ \
  --read-only --tmpfs /tmp --tmpfs /etc/nginx/conf.d:uid=101,gid=101 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  call-coach-landing:local
```

The image builds and checks the site with Node, then serves `dist/` with `nginxinc/nginx-unprivileged` as a non-root user on port 8080. `/healthz` returns `ok` and backs the image health check. Responses carry a strict Content-Security-Policy (no scripts), `nosniff`, a referrer policy and a permissions policy. Terminate HTTPS in front of the container, as for the application.

Test the running container in all five browser projects with the official Playwright image:

```sh
docker run --rm --network host --ipc host -v "$PWD/landing-page:/work" -w /work \
  -e BASE_URL=http://127.0.0.1:8080 -e CALL_COACH_APP_URL=https://calls.example.com/ \
  mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
```

This project is not part of the application's Docker Compose or Helm setup.
