#!/bin/sh
# Refuses to start the landing page without a valid application address, so a
# forgotten setting cannot silently point every "Call Coach öffnen" link elsewhere.
# CALL_COACH_APP_URL must be an HTTPS origin (optional port and trailing slash, no
# path, query or credentials). Plain HTTP is accepted only for localhost/127.0.0.1.
set -eu

url="${CALL_COACH_APP_URL:-}"
host='[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*'

if [ -z "$url" ]; then
    echo "$0: CALL_COACH_APP_URL is not set. Set it to the public HTTPS origin of the Call Coach application, e.g. https://calls.example.com" >&2
    exit 1
fi

if printf '%s' "$url" | grep -Eqx "https://${host}(:[0-9]{1,5})?/?" ||
   printf '%s' "$url" | grep -Eqx "http://(localhost|127\.0\.0\.1)(:[0-9]{1,5})?/?"; then
    echo "$0: Call Coach application links point to $url"
    exit 0
fi

echo "$0: CALL_COACH_APP_URL='$url' is invalid. Use an HTTPS origin such as https://calls.example.com (no path, query or credentials; http:// only for localhost)." >&2
exit 1
