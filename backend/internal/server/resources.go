package server

import (
	"context"
	"encoding/json"
	"reflect"
	"strings"
	"time"

	"callcoach/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"net/http"
)

type queryer interface {
	QueryRow(context.Context, string, ...any) pgx.Row
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}
type Script struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Definition     json.RawMessage `json:"definition"`
	Revision       int64           `json:"revision"`
	Validation     []domain.Issue  `json:"validation"`
	Runnable       bool            `json:"runnable"`
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	LastExecutedAt *time.Time      `json:"lastExecutedAt"`
}
type Run struct {
	ID              string          `json:"id"`
	SourceID        string          `json:"sourceScriptId"`
	SourceRevision  int64           `json:"sourceRevision"`
	ScriptName      string          `json:"scriptName"`
	Snapshot        json.RawMessage `json:"snapshot"`
	Lead            Lead            `json:"lead"`
	Phase           string          `json:"phase"`
	Progress        domain.Progress `json:"progress"`
	CallNotes       string          `json:"callNotes"`
	Outcome         *string         `json:"outcome"`
	EvaluationNotes string          `json:"evaluationNotes"`
	StartedAt       time.Time       `json:"startedAt"`
	CompletedAt     *time.Time      `json:"completedAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
	Revision        int64           `json:"revision"`
}
type Lead struct {
	Name    string `json:"name"`
	Company string `json:"company"`
	Phone   string `json:"phone"`
}

func getScript(ctx context.Context, q queryer, id string, lock bool) (Script, error) {
	var s Script
	var validation []byte
	suffix := ""
	if lock {
		suffix = " FOR UPDATE"
	}
	e := q.QueryRow(ctx, `SELECT id::text,name,definition,revision,validation,created_at,updated_at,last_executed_at FROM scripts WHERE id=$1 AND deleted_at IS NULL`+suffix, id).Scan(&s.ID, &s.Name, &s.Definition, &s.Revision, &validation, &s.CreatedAt, &s.UpdatedAt, &s.LastExecutedAt)
	if e != nil {
		return s, e
	}
	if e = json.Unmarshal(validation, &s.Validation); e != nil {
		return s, e
	}
	s.CreatedAt = s.CreatedAt.UTC()
	s.UpdatedAt = s.UpdatedAt.UTC()
	if s.LastExecutedAt != nil {
		utc := s.LastExecutedAt.UTC()
		s.LastExecutedAt = &utc
	}
	s.Runnable = len(s.Validation) == 0
	s.Definition = domain.NormalizeStored(s.Definition)
	return s, nil
}
func getRun(ctx context.Context, q queryer, id string, lock bool) (Run, error) {
	var v Run
	var lead, progress []byte
	suffix := ""
	if lock {
		suffix = " FOR UPDATE"
	}
	e := q.QueryRow(ctx, `SELECT id::text,source_script_id::text,source_revision,script_name,script_snapshot,lead,phase,progress,call_notes,outcome,evaluation_notes,started_at,completed_at,updated_at,revision FROM runs WHERE id=$1`+suffix, id).Scan(&v.ID, &v.SourceID, &v.SourceRevision, &v.ScriptName, &v.Snapshot, &lead, &v.Phase, &progress, &v.CallNotes, &v.Outcome, &v.EvaluationNotes, &v.StartedAt, &v.CompletedAt, &v.UpdatedAt, &v.Revision)
	if e != nil {
		return v, e
	}
	if e = json.Unmarshal(lead, &v.Lead); e != nil {
		return v, e
	}
	e = json.Unmarshal(progress, &v.Progress)
	v.Snapshot = domain.NormalizeStored(v.Snapshot)
	v.StartedAt = v.StartedAt.UTC()
	v.UpdatedAt = v.UpdatedAt.UTC()
	if v.CompletedAt != nil {
		utc := v.CompletedAt.UTC()
		v.CompletedAt = &utc
	}
	return v, e
}
func same(a, b json.RawMessage) bool {
	var x, y any
	return json.Unmarshal(a, &x) == nil && json.Unmarshal(b, &y) == nil && reflect.DeepEqual(x, y)
}
func (s *Server) listScripts(w http.ResponseWriter, r *http.Request) (int, error) {
	page, size := pagination(r)
	col := "updated_at"
	if r.URL.Query().Get("sort") == "name" {
		col = "name"
	}
	order := "DESC"
	if r.URL.Query().Get("order") == "asc" {
		order = "ASC"
	}
	rows, e := s.DB.Query(r.Context(), "SELECT id::text FROM scripts WHERE deleted_at IS NULL ORDER BY "+col+" "+order+",id "+order+" LIMIT $1 OFFSET $2", size, (page-1)*size)
	if e != nil {
		return 0, e
	}
	ids := []string{}
	for rows.Next() {
		var id string
		if e = rows.Scan(&id); e != nil {
			rows.Close()
			return 0, e
		}
		ids = append(ids, id)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return 0, e
	}
	items := []Script{}
	for _, id := range ids {
		v, e := getScript(r.Context(), s.DB, id, false)
		if e != nil {
			if e == pgx.ErrNoRows {
				continue
			}
			return 0, e
		}
		items = append(items, v)
	}
	var total int
	if e = s.DB.QueryRow(r.Context(), "SELECT count(*) FROM scripts WHERE deleted_at IS NULL").Scan(&total); e != nil {
		return 0, e
	}
	write(w, 200, map[string]any{"items": items, "page": page, "pageSize": size, "total": total})
	return 200, nil
}
func (s *Server) saveScript(w http.ResponseWriter, r *http.Request, id string) (int, error) {
	var b struct {
		Name       string          `json:"name"`
		Definition json.RawMessage `json:"definition"`
		Expected   int64           `json:"expectedRevision"`
	}
	if e := decode(r, &b); e != nil {
		return 0, e
	}
	b.Name = strings.TrimSpace(b.Name)
	if id != "" && b.Expected < 1 {
		return 0, fail(422, "INVALID_FIELDS", "expectedRevision is required.")
	}
	if !validName(b.Name) {
		return 0, fail(422, "INVALID_FIELDS", "Enter a script name of up to 200 characters.")
	}
	d, e := domain.Parse(b.Definition)
	if e != nil {
		return 0, fail(422, "INVALID_SCHEMA", e.Error())
	}
	validation, _ := json.Marshal(domain.Validate(d))
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		return 0, e
	}
	defer tx.Rollback(r.Context())
	status := 200
	if id == "" {
		status = 201
		id = ID()
		_, e = tx.Exec(r.Context(), "INSERT INTO scripts(id,name,definition,validation) VALUES($1,$2,$3,$4)", id, b.Name, b.Definition, validation)
	} else {
		v, err := getScript(r.Context(), tx, id, true)
		if err != nil {
			return 0, err
		}
		if b.Expected != v.Revision {
			return 0, conflict(v.Revision)
		}
		if v.Name != b.Name || !same(v.Definition, b.Definition) {
			_, e = tx.Exec(r.Context(), "UPDATE scripts SET name=$2,definition=$3,validation=$4,revision=revision+1,updated_at=now() WHERE id=$1", id, b.Name, b.Definition, validation)
		}
	}
	if e != nil {
		return 0, e
	}
	v, e := getScript(r.Context(), tx, id, false)
	if e != nil {
		return 0, e
	}
	if e = tx.Commit(r.Context()); e != nil {
		return 0, e
	}
	write(w, status, v)
	return status, nil
}
func (s *Server) duplicate(w http.ResponseWriter, r *http.Request, id string) (int, error) {
	var b struct {
		Name string `json:"name"`
	}
	if e := decode(r, &b); e != nil {
		return 0, e
	}
	b.Name = strings.TrimSpace(b.Name)
	if !validName(b.Name) {
		return 0, fail(422, "INVALID_FIELDS", "Enter a name for the duplicate.")
	}
	tx, e := s.DB.Begin(r.Context())
	if e != nil {
		return 0, e
	}
	defer tx.Rollback(r.Context())
	v, e := getScript(r.Context(), tx, id, true)
	if e != nil {
		return 0, e
	}
	newID := ID()
	validation, _ := json.Marshal(v.Validation)
	if _, e = tx.Exec(r.Context(), "INSERT INTO scripts(id,name,definition,validation) VALUES($1,$2,$3,$4)", newID, b.Name, v.Definition, validation); e != nil {
		return 0, e
	}
	copy, e := getScript(r.Context(), tx, newID, false)
	if e != nil {
		return 0, e
	}
	if e = tx.Commit(r.Context()); e != nil {
		return 0, e
	}
	write(w, 201, copy)
	return 201, nil
}
func idempotent(ctx context.Context, tx pgx.Tx, scope, key, fingerprint string) (json.RawMessage, error) {
	if len(key) < 8 || len(key) > 128 {
		return nil, fail(422, "INVALID_FIELDS", "Provide a unique request ID (8–128 characters).")
	}
	if _, e := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtextextended($1,0))", scope+":"+key); e != nil {
		return nil, e
	}
	var f string
	var raw json.RawMessage
	var id string
	e := tx.QueryRow(ctx, "SELECT fingerprint,response,resource_id::text FROM idempotency_keys WHERE scope=$1 AND key=$2", scope, key).Scan(&f, &raw, &id)
	if e == pgx.ErrNoRows {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	if f != fingerprint {
		return nil, fail(409, "IDEMPOTENCY_CONFLICT", "This request ID was already used for different data.")
	}
	var exists bool
	if e = tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM runs WHERE id=$1)", id).Scan(&exists); e != nil {
		return nil, e
	}
	if !exists {
		return nil, pgx.ErrNoRows
	}
	var cached Run
	if err := json.Unmarshal(raw, &cached); err != nil {
		return nil, err
	}
	cached.Snapshot = domain.NormalizeStored(cached.Snapshot)
	return json.Marshal(cached)
}
func recordKey(ctx context.Context, tx pgx.Tx, scope, key, fingerprint string, v Run) error {
	raw, _ := json.Marshal(v)
	_, e := tx.Exec(ctx, "INSERT INTO idempotency_keys(scope,key,fingerprint,resource_id,response) VALUES($1,$2,$3,$4,$5)", scope, key, fingerprint, v.ID, raw)
	return e
}
func (s *Server) createRun(w http.ResponseWriter, r *http.Request) (int, error) {
	var b struct {
		ScriptID string `json:"scriptId"`
		Expected int64  `json:"expectedScriptRevision"`
		Lead     Lead   `json:"lead"`
		Key      string `json:"clientRequestId"`
	}
	if e := decode(r, &b); e != nil {
		return 0, e
	}
	b.Lead.Name = strings.TrimSpace(b.Lead.Name)
	b.Lead.Company = strings.TrimSpace(b.Lead.Company)
	b.Lead.Phone = strings.TrimSpace(b.Lead.Phone)
	if !uuid.MatchString(b.ScriptID) || b.Lead.Name == "" || b.Lead.Company == "" || b.Lead.Phone == "" || len(b.Lead.Name) > 500 || len(b.Lead.Company) > 500 || len(b.Lead.Phone) > 100 {
		return 0, fail(422, "INVALID_FIELDS", "Enter the lead’s name, company, and phone number.")
	}
	raw, _ := json.Marshal(b)
	fp := hash(string(raw))
	ctx := r.Context()
	tx, e := s.DB.Begin(ctx)
	if e != nil {
		return 0, e
	}
	defer tx.Rollback(ctx)
	cached, e := idempotent(ctx, tx, "create-run", b.Key, fp)
	if e != nil {
		return 0, e
	}
	if cached != nil {
		write(w, 200, cached)
		return 200, nil
	}
	script, e := getScript(ctx, tx, b.ScriptID, true)
	if e != nil {
		return 0, e
	}
	if script.Revision != b.Expected {
		return 0, conflict(script.Revision)
	}
	d, e := domain.Parse(script.Definition)
	if e != nil {
		return 0, e
	}
	issues := domain.Validate(d)
	if len(issues) > 0 {
		return 0, &failure{422, APIError{Code: "INVALID_GRAPH", Message: "Resolve the script errors before starting a call.", Fields: issues}}
	}
	id := ID()
	progress, _ := json.Marshal(domain.Initial(d, ""))
	lead, _ := json.Marshal(b.Lead)
	if _, e = tx.Exec(ctx, `INSERT INTO runs(id,source_script_id,source_revision,script_name,script_snapshot,lead,phase,progress) VALUES($1,$2,$3,$4,$5,$6,'in_progress',$7)`, id, script.ID, script.Revision, script.Name, script.Definition, lead, progress); e != nil {
		return 0, e
	}
	if _, e = tx.Exec(ctx, "UPDATE scripts SET last_executed_at=now() WHERE id=$1", script.ID); e != nil {
		return 0, e
	}
	v, e := getRun(ctx, tx, id, false)
	if e != nil {
		return 0, e
	}
	if e = recordKey(ctx, tx, "create-run", b.Key, fp, v); e != nil {
		return 0, e
	}
	if e = tx.Commit(ctx); e != nil {
		return 0, e
	}
	write(w, 201, v)
	return 201, nil
}

type State struct {
	Expected        int64           `json:"expectedRevision"`
	Progress        domain.Progress `json:"progress"`
	CallNotes       string          `json:"callNotes"`
	Phase           string          `json:"phase"`
	Outcome         *string         `json:"outcome"`
	EvaluationNotes string          `json:"evaluationNotes"`
	Key             string          `json:"idempotencyKey,omitempty"`
}

func (s *Server) updateRun(w http.ResponseWriter, r *http.Request, id string, complete bool) (int, error) {
	var b State
	if e := decode(r, &b); e != nil {
		return 0, e
	}
	if b.Expected < 1 {
		return 0, fail(422, "INVALID_FIELDS", "expectedRevision is required.")
	}
	if (b.Phase != "in_progress" && b.Phase != "evaluating") || len(b.CallNotes) > 500000 || len(b.EvaluationNotes) > 500000 || (b.Outcome != nil && *b.Outcome != "success" && *b.Outcome != "failure") {
		return 0, fail(422, "INVALID_FIELDS", "Use a valid open phase, notes, and outcome.")
	}
	if complete && (b.Phase != "evaluating" || b.Outcome == nil) {
		return 0, fail(422, "OUTCOME_REQUIRED", "Choose Success or Failure to complete the call.")
	}
	ctx := r.Context()
	tx, e := s.DB.Begin(ctx)
	if e != nil {
		return 0, e
	}
	defer tx.Rollback(ctx)
	raw, _ := json.Marshal(b)
	fp := hash(string(raw))
	scope := "complete:" + id
	if complete {
		cached, err := idempotent(ctx, tx, scope, b.Key, fp)
		if err != nil {
			return 0, err
		}
		if cached != nil {
			write(w, 200, cached)
			return 200, nil
		}
	}
	v, e := getRun(ctx, tx, id, true)
	if e != nil {
		return 0, e
	}
	if v.Phase == "completed" {
		return 0, fail(409, "COMPLETED", "This completed call is read-only.")
	}
	if v.Revision != b.Expected {
		return 0, conflict(v.Revision)
	}
	if v.Phase == "evaluating" && b.Phase != "evaluating" {
		return 0, fail(422, "INVALID_PHASE", "This call is awaiting evaluation.")
	}
	var d domain.Definition
	if e = json.Unmarshal(v.Snapshot, &d); e != nil {
		return 0, e
	}
	if e = domain.ValidateProgress(d, b.Progress); e != nil {
		return 0, fail(422, "INVALID_PROGRESS", e.Error())
	}
	progress, _ := json.Marshal(b.Progress)
	phase := b.Phase
	var completed *time.Time
	if complete {
		phase = "completed"
		now := time.Now().UTC()
		completed = &now
	}
	if _, e = tx.Exec(ctx, `UPDATE runs SET progress=$2,call_notes=$3,phase=$4,outcome=$5,evaluation_notes=$6,completed_at=$7,revision=revision+1,updated_at=now() WHERE id=$1`, id, progress, b.CallNotes, phase, b.Outcome, b.EvaluationNotes, completed); e != nil {
		return 0, e
	}
	v, e = getRun(ctx, tx, id, false)
	if e != nil {
		return 0, e
	}
	if complete {
		if e = recordKey(ctx, tx, scope, b.Key, fp, v); e != nil {
			return 0, e
		}
	}
	if e = tx.Commit(ctx); e != nil {
		return 0, e
	}
	write(w, 200, v)
	return 200, nil
}
func (s *Server) listRuns(w http.ResponseWriter, r *http.Request) (int, error) {
	page, size := pagination(r)
	filter := r.URL.Query().Get("scriptId")
	if filter != "" && !uuid.MatchString(filter) {
		return 0, fail(422, "INVALID_FIELDS", "Choose a valid script identity.")
	}
	rows, e := s.DB.Query(r.Context(), `SELECT id::text,source_script_id::text,script_name,lead,phase,started_at,completed_at FROM runs WHERE ($1='' OR source_script_id::text=$1) ORDER BY started_at DESC,id DESC LIMIT $2 OFFSET $3`, filter, size, (page-1)*size)
	if e != nil {
		return 0, e
	}
	defer rows.Close()
	items := []map[string]any{}
	for rows.Next() {
		var id, source, name, phase string
		var lead json.RawMessage
		var started time.Time
		var completed *time.Time
		if e = rows.Scan(&id, &source, &name, &lead, &phase, &started, &completed); e != nil {
			return 0, e
		}
		items = append(items, map[string]any{"id": id, "sourceScriptId": source, "scriptName": name, "lead": lead, "phase": phase, "startedAt": started, "completedAt": completed})
	}
	if e = rows.Err(); e != nil {
		return 0, e
	}
	var total int
	if e = s.DB.QueryRow(r.Context(), "SELECT count(*) FROM runs WHERE ($1='' OR source_script_id::text=$1)", filter).Scan(&total); e != nil {
		return 0, e
	}
	write(w, 200, map[string]any{"items": items, "page": page, "pageSize": size, "total": total})
	return 200, nil
}
