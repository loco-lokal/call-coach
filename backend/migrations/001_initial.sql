CREATE TABLE IF NOT EXISTS scripts (
 id uuid PRIMARY KEY, name text NOT NULL, definition jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1,
 validation jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 last_executed_at timestamptz, deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS scripts_updated ON scripts(updated_at DESC,id);
CREATE INDEX IF NOT EXISTS scripts_name ON scripts(name,id);
CREATE TABLE IF NOT EXISTS runs (
 id uuid PRIMARY KEY, source_script_id uuid NOT NULL REFERENCES scripts(id), source_revision bigint NOT NULL,
 script_name text NOT NULL, script_snapshot jsonb NOT NULL, lead jsonb NOT NULL, phase text NOT NULL CHECK(phase IN ('in_progress','evaluating','completed')),
 progress jsonb NOT NULL, call_notes text NOT NULL DEFAULT '', outcome text CHECK(outcome IN ('success','failure')),
 evaluation_notes text NOT NULL DEFAULT '', started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), revision bigint NOT NULL DEFAULT 1,
 CHECK ((phase='completed' AND completed_at IS NOT NULL AND outcome IS NOT NULL) OR (phase<>'completed' AND completed_at IS NULL))
);
CREATE INDEX IF NOT EXISTS runs_started ON runs(started_at DESC,id);
CREATE INDEX IF NOT EXISTS runs_script ON runs(source_script_id,started_at DESC,id);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now(),expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS idempotency_keys (scope text NOT NULL,key text NOT NULL,fingerprint text NOT NULL,resource_id uuid NOT NULL,response jsonb NOT NULL,PRIMARY KEY(scope,key));
CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION protect_run_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.phase='completed' THEN RAISE EXCEPTION 'completed runs are immutable'; END IF;
 IF NEW.script_snapshot IS DISTINCT FROM OLD.script_snapshot OR NEW.source_script_id IS DISTINCT FROM OLD.source_script_id OR NEW.source_revision IS DISTINCT FROM OLD.source_revision OR NEW.lead IS DISTINCT FROM OLD.lead OR NEW.started_at IS DISTINCT FROM OLD.started_at OR NEW.script_name IS DISTINCT FROM OLD.script_name THEN RAISE EXCEPTION 'run snapshot is immutable'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS immutable_run_snapshot ON runs;
CREATE TRIGGER immutable_run_snapshot BEFORE UPDATE ON runs FOR EACH ROW EXECUTE FUNCTION protect_run_snapshot();
