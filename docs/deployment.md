# Deployment and operations

## Configuration

| Variable | Where | Meaning |
| --- | --- | --- |
| CALL_COACH_PASSWORD | API secret | Shared password, 12–72 bytes. Hashed with bcrypt in memory; never stored as a password in the database. |
| CALL_COACH_API_KEY | API secret | At least 32 random characters. Agent bearer access only lists/reads/creates/updates scripts. |
| DATABASE_URL | API/migrations secret | PostgreSQL connection URI. Compose derives it from a URL-safe POSTGRES_PASSWORD. |
| POSTGRES_PASSWORD | Database secret | Initialization password for bundled PostgreSQL. Use independent random hex values. |
| PUBLIC_APP_URL | API | Exact public HTTP(S) origin, with no path. Browser mutation Origin must match. |
| INTERNAL_API_URL | Web only | Internal Go service address; defaults to http://api:8080. |
| COOKIE_SECURE | API | true for HTTPS; false only for explicit local HTTP. |
| SESSION_TTL_HOURS | API | 24 by default; absolute lifetime, not sliding. |
| COMPONENT_PREVIEW | Web | Optional authenticated component gallery; false by default. |

Use independent secrets and an environment/secret manager. None belong in NEXT_PUBLIC variables or Dockerfiles. Configuration downloads contain the actual API key and return no-store. Executables contain no key. Do not place keys in URLs or logs.

## Docker Compose

From the repository root, prepare `.env` from `.env.example`, replace placeholders, and run:

```sh
docker compose up --build --wait web
```

Services are web, api, db, and the one-shot migrate service. The API waits for successful migration completion; readiness includes database/migration availability. PostgreSQL 18 data is mounted at `/var/lib/postgresql` in `postgres-data`. Replace containers freely; retain the volume. `docker compose down` retains data. `down -v` removes it and is only suitable for explicitly disposable deployments.

For an explicit migration:

```sh
docker compose run --rm migrate
```

Migrations are checked into `backend/migrations`, run in a transaction, and serialized with a database advisory lock. The initial migration is repeatable; subsequent schema changes must receive new checked-in versions before release. Deploy matching web/API images and MCP executables from one release.

## HTTPS example

The supplied Caddy overlay is an optional production path. Point a real DNS hostname at the server, configure APP_HOST, PUBLIC_APP_URL=https://your-hostname and COOKIE_SECURE=true in the deployment environment, then run:

```sh
docker compose -f docker-compose.yml -f deploy/docker-compose.https.yml up --build --wait web caddy
```

The overlay requires a Compose release supporting `!reset` (v2.24.4+). It removes the loopback web mapping and exposes Caddy on 80/443. Caddy handles certificates and proxies only to web; browser and agent API traffic stays on the same public origin. Certificate/config volumes are persistent. An equivalent managed HTTPS ingress/reverse proxy is also suitable. The Go API and PostgreSQL do not publish host ports.

This overlay is configuration for an operator-controlled host. No public domain, certificate, or production service is created by the local test workflow.

## Kubernetes / Helm

Build and publish the two matching release images first:

```sh
docker build --target runtime -t REGISTRY/call-coach-web:1.0.0 .
docker build --target runtime -t REGISTRY/call-coach-api:1.0.0 backend
```

Use an ingress controller, DNS, a TLS secret/certificate manager, and persistent storage appropriate to your cluster. Pre-create a namespace and a Secret named call-coach-secrets. A private `.env.kubernetes` file should contain CALL_COACH_PASSWORD, CALL_COACH_API_KEY, POSTGRES_PASSWORD and DATABASE_URL. For release `coach` with the bundled database, the URI host is `coach-call-coach-db:5432`, database/user `callcoach`. Percent-encode URI password characters when needed. Do not commit the file.

```sh
kubectl create namespace coach
kubectl -n coach create secret generic call-coach-secrets --from-env-file=.env.kubernetes
helm upgrade --install coach deploy/helm/call-coach -n coach \
  --set image.repository=REGISTRY/call-coach-web \
  --set apiImage.repository=REGISTRY/call-coach-api \
  --set publicAppUrl=https://calls.example.com \
  --set ingress.enabled=true --set ingress.host=calls.example.com \
  --set ingress.className=YOUR_INGRESS_CLASS \
  --set 'ingress.tls[0].secretName=call-coach-tls' \
  --set 'ingress.tls[0].hosts[0]=calls.example.com' --wait
```

The chart deploys web/API Deployments, an API migration init container, private Services, and a PostgreSQL StatefulSet/PVC. Migration failure keeps API pods out of service. Readiness includes the migrated database. Nonroot workloads, restricted capabilities, read-only application roots, no mounted service-account token, and API/database ingress NetworkPolicies are configured. NetworkPolicies require a supporting CNI. The bundled database is one instance, not an HA PostgreSQL service.

For managed PostgreSQL, set `postgresql.enabled=false` and supply its properly TLS-configured DATABASE_URL in the Secret. Provision backups, storage classes and resource limits for the environment. PVCs created by the StatefulSet are retained across normal replacement/uninstall; verify your storage provider’s retention behavior before deleting claims.

Validate manifests locally:

```sh
helm lint deploy/helm/call-coach
helm template coach deploy/helm/call-coach > /tmp/call-coach.yaml
```

Rendered/linted manifests do not constitute a live-cluster deployment test.

## Credential rotation

Password/API-key changes require an API restart. To prevent sessions minted with the old password remaining valid, stop API traffic, update the secret, revoke sessions, then restart:

```sh
docker compose stop api
docker compose run --rm --no-deps api revoke-sessions
docker compose up -d --wait web
```

Edit `.env` before the revoke/restart commands. In Kubernetes, update the Secret, stop/roll API traffic as appropriate, and invoke `/app/api revoke-sessions` with the new deployment database configuration before admitting traffic again. The chart’s API image includes this command. Existing local drafts remain recoverable after signing in again. Old MCP configurations stop working after key rotation; download a fresh private config.

Changing POSTGRES_PASSWORD alone does not change the password of an already initialized PostgreSQL volume. Database-role rotation is a separate PostgreSQL administration operation and must be coordinated with DATABASE_URL updates.

## Backup and restore

Store backups outside disposable containers and protect them like call records. They contain scripts, open calls, completed snapshots, notes, and session-token hashes. Operator backups may retain records already deleted from the live application. There is no automatic retention expiry in this version.

Create a consistent custom-format backup:

```sh
umask 077
docker compose exec -T db pg_dump -U callcoach -d callcoach -Fc > call-coach.dump
```

Test restoration into a separate empty database before replacing production data. The following replacement procedure is destructive to the target database; use only after verifying the backup and stopping application writes:

```sh
docker compose stop api web
docker compose exec -T db dropdb -U callcoach --force callcoach
docker compose exec -T db createdb -U callcoach callcoach
docker compose exec -T db pg_restore -U callcoach -d callcoach --exit-on-error < call-coach.dump
docker compose run --rm migrate
docker compose run --rm --no-deps api revoke-sessions
docker compose up -d --wait web
```

Use matching PostgreSQL/application releases and retain the deployment secrets separately. Kubernetes operators can run pg_dump/pg_restore inside the database pod or use their managed database’s supported backup service; API images deliberately contain no database shell tools.

`./scripts/test-compose.sh` verifies container replacement and a restore into a separate database using deterministic data checksums. It operates only on its isolated test project and disposable volume, and does not replace the normal application database.
