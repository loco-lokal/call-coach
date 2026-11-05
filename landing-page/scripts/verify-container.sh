#!/usr/bin/env bash
# Reproducible end-to-end check of the production image, for CI and local use:
#   1. builds the image,
#   2. checks that it refuses to start without a valid CALL_COACH_APP_URL,
#   3. runs it hardened (read-only, no capabilities) and waits for /healthz,
#   4. runs the Playwright suite against it in all browser projects using the
#      official Playwright image (no local browsers needed).
# Requires Docker and installed dependencies (npm ci). Port 8080 must be free.
# SKIP_BUILD=1 reuses an existing $IMAGE instead of building it.
set -euo pipefail

cd "$(dirname "$0")/.."
image="${IMAGE:-call-coach-landing:verify}"
app_url="https://app.call-coach.test/"
playwright_image="mcr.microsoft.com/playwright:v1.64.1-noble"

cleanup() { docker rm -f landing-verify landing-invalid >/dev/null 2>&1 || true; }
trap cleanup EXIT

[ -n "${SKIP_BUILD:-}" ] || docker build -t "$image" .

for value in "" "http://calls.example.com" "https://calls.example.com/path" "https://a.example';x"; do
  docker rm -f landing-invalid >/dev/null 2>&1 || true
  docker run -d --name landing-invalid -e CALL_COACH_APP_URL="$value" "$image" >/dev/null
  sleep 3
  if [ "$(docker inspect -f '{{.State.Running}}' landing-invalid)" = "true" ]; then
    echo "FAIL: container started with CALL_COACH_APP_URL='$value'" >&2
    exit 1
  fi
  docker logs landing-invalid 2>&1 | grep 'validate-app-url' || true
done

docker run -d --name landing-verify -p 127.0.0.1:8080:8080 --read-only \
  --tmpfs /tmp --tmpfs /etc/nginx/conf.d:uid=101,gid=101 \
  --cap-drop ALL --security-opt no-new-privileges:true \
  -e CALL_COACH_APP_URL="$app_url" "$image" >/dev/null
for _ in $(seq 1 30); do
  curl -fsS http://127.0.0.1:8080/healthz >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS http://127.0.0.1:8080/healthz >/dev/null || { docker logs landing-verify; exit 1; }

docker run --rm --network host --ipc host -v "$PWD:/work" -w /work \
  -e CI=true -e BASE_URL=http://127.0.0.1:8080 -e CALL_COACH_APP_URL="$app_url" \
  "$playwright_image" npx playwright test
