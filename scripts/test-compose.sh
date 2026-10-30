#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
test_env_file=$(mktemp)
backup_file=$(mktemp)
chmod 600 "$test_env_file" "$backup_file"
compose() { docker compose --env-file "$test_env_file" -p call-coach-ci -f docker-compose.yml -f docker-compose.test.yml "$@"; }
cleanup() {
  compose logs --no-color api web migrate > playwright-report/compose.log 2>&1 || true
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$test_env_file" "$backup_file"
}
python3 - <<'PY_CLEAR'
from pathlib import Path
import shutil
for name in ['html','results','evidence']:
    shutil.rmtree(Path('playwright-report')/name,ignore_errors=True)
PY_CLEAR
mkdir -p playwright-report
trap cleanup EXIT HUP INT TERM
python3 - "$test_env_file" <<'PY'
import secrets,sys
from pathlib import Path
Path(sys.argv[1]).write_text('POSTGRES_PASSWORD='+secrets.token_hex(24)+'\nCALL_COACH_PASSWORD='+secrets.token_urlsafe(20)+'\nCALL_COACH_API_KEY='+secrets.token_urlsafe(40)+'\nPUBLIC_APP_URL=http://web:3000\nCOOKIE_SECURE=false\nWEB_PORT=3001\nCOMPONENT_PREVIEW=true\n')
PY
compose build web api migrate playwright api-tests
compose up --wait web
compose run --rm --no-deps api-tests
compose run --rm --no-deps playwright
compose run --rm --no-deps playwright node tests/ops/deployment.mjs seed
checksum_sql="SELECT md5(jsonb_build_object('scripts',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM scripts s),'runs',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM runs r))::text)"
baseline=$(compose exec -T db psql -U callcoach -d callcoach -Atc "$checksum_sql")
compose exec -T db pg_dump -U callcoach -d callcoach -Fc > "$backup_file"
compose up -d --no-deps --force-recreate api web
compose up --wait web
compose run --rm --no-deps playwright node tests/ops/deployment.mjs verify
current=$(compose exec -T db psql -U callcoach -d callcoach -Atc "$checksum_sql")
[ "$baseline" = "$current" ]
compose exec -T db createdb -U callcoach restorecheck
compose exec -T db pg_restore -U callcoach -d restorecheck --exit-on-error < "$backup_file"
restored=$(compose exec -T db psql -U callcoach -d restorecheck -Atc "$checksum_sql")
[ "$baseline" = "$restored" ]
compose exec -T db dropdb -U callcoach restorecheck
printf '%s\n' 'Container replacement and backup/restore checks passed.'
