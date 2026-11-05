# Call Coach landing page: static HTML/CSS served by unprivileged nginx.
FROM node:24.16.0-bookworm-slim AS build
WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY scripts ./scripts
COPY src ./src
RUN node scripts/lint.mjs && node scripts/build.mjs

FROM nginxinc/nginx-unprivileged:1.30.6-alpine-slim AS runtime
ENV CALL_COACH_APP_URL=http://127.0.0.1:3000
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /site/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
