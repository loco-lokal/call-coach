package server

import (
	"bytes"
	"context"
	"encoding/json"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"testing"

	"callcoach/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestDatabaseWorkflow(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL enables PostgreSQL integration tests")
	}
	ctx := context.Background()
	root, e := pgxpool.New(ctx, dsn)
	if e != nil {
		t.Fatal(e)
	}
	defer root.Close()
	schema := "test_" + strings.ReplaceAll(ID(), "-", "")
	if _, e = root.Exec(ctx, "CREATE SCHEMA "+schema); e != nil {
		t.Fatal(e)
	}
	defer root.Exec(ctx, "DROP SCHEMA "+schema+" CASCADE")
	config, e := pgxpool.ParseConfig(dsn)
	if e != nil {
		t.Fatal(e)
	}
	config.ConnConfig.RuntimeParams["search_path"] = schema + ",public"
	db, e := pgxpool.NewWithConfig(ctx, config)
	if e != nil {
		t.Fatal(e)
	}
	defer db.Close()
	if _, e = db.Exec(ctx, migrations.Initial); e != nil {
		t.Fatal(e)
	}
	var logs bytes.Buffer
	oldLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	defer slog.SetDefault(oldLogger)
	const password = "test-password-long"
	key := strings.Repeat("key-secret-", 4)
	s, e := New(db, Config{Password: password, APIKey: key, PublicURL: "http://calls.example"})
	if e != nil {
		t.Fatal(e)
	}
	handler := s.Handler()
	var cookie *http.Cookie
	request := func(method, path string, body any, auth string, origin bool) *httptest.ResponseRecorder {
		var reader io.Reader
		if body != nil {
			raw, _ := json.Marshal(body)
			reader = bytes.NewReader(raw)
		}
		r := httptest.NewRequest(method, path, reader)
		r.Header.Set("Content-Type", "application/json")
		if origin {
			r.Header.Set("Origin", "http://calls.example")
		}
		if auth == "session" && cookie != nil {
			r.AddCookie(cookie)
		} else if auth == "key" {
			r.Header.Set("Authorization", "Bearer "+key)
		}
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	check := func(w *httptest.ResponseRecorder, status int) {
		t.Helper()
		if w.Code != status {
			t.Fatalf("expected%d got%d %s", status, w.Code, w.Body)
		}
	}
	decodeMap := func(w *httptest.ResponseRecorder) map[string]any {
		var v map[string]any
		if e := json.Unmarshal(w.Body.Bytes(), &v); e != nil {
			t.Fatal(e)
		}
		return v
	}
	check(request("GET", "/api/v1/scripts", nil, "", false), 401)
	check(request("POST", "/api/v1/auth/login", map[string]any{"password": password}, "", false), 403)
	login := request("POST", "/api/v1/auth/login", map[string]any{"password": password}, "", true)
	check(login, 200)
	cookie = login.Result().Cookies()[0]
	t.Run("legacy questions preserve scripts and frozen calls", func(t *testing.T) {
		legacy := `{"schemaVersion":1,"nodes":[{"id":"legacy","type":"question","isStart":true,"text":"Why?","next":null}]}`
		scriptID, runID := ID(), ID()
		_, err := db.Exec(ctx, `INSERT INTO scripts(id,name,definition,validation) VALUES($1,'Legacy',$2,'[]')`, scriptID, legacy)
		if err != nil {
			t.Fatal(err)
		}
		defer db.Exec(ctx, `DELETE FROM scripts WHERE id=$1`, scriptID)
		progress := `{"groups":[{"firstNodeId":"legacy"}],"activeGroupIndex":0,"choices":{},"retainedNodeIds":["legacy"]}`
		_, err = db.Exec(ctx, `INSERT INTO runs(id,source_script_id,source_revision,script_name,script_snapshot,lead,phase,progress,outcome,completed_at) VALUES($1,$2,1,'Legacy',$3,'{"name":"Sample","company":"Example","phone":"local"}','completed',$4,'success',now())`, runID, scriptID, legacy, progress)
		if err != nil {
			t.Fatal(err)
		}
		defer db.Exec(ctx, `DELETE FROM runs WHERE id=$1`, runID)
		for _, path := range []string{"/api/v1/scripts/" + scriptID, "/api/v1/runs/" + runID} {
			res := request("GET", path, nil, "session", false)
			check(res, 200)
			if strings.Contains(res.Body.String(), `"type":"question"`) || !strings.Contains(res.Body.String(), `"type":"talking_point"`) {
				t.Fatal("legacy type not adapted")
			}
		}
		var stored string
		if err = db.QueryRow(ctx, `SELECT script_snapshot->'nodes'->0->>'type' FROM runs WHERE id=$1`, runID).Scan(&stored); err != nil || stored != "question" {
			t.Fatal("stored frozen snapshot was rewritten")
		}
	})
	if !cookie.HttpOnly || cookie.Domain != "" {
		t.Fatal("insecure cookie")
	}
	for _, path := range []string{"/api/v1/runs", "/api/v1/docs/mcp-config", "/api/v1/docs/script-schema"} {
		check(request("GET", path, nil, "key", false), 403)
	}
	configResponse := request("GET", "/api/v1/docs/mcp-config", nil, "session", false)
	check(configResponse, 200)
	if configResponse.Header().Get("Cache-Control") != "no-store" || !strings.Contains(configResponse.Body.String(), key) {
		t.Fatal("private config response")
	}
	check(request("POST", "/api/v1/scripts", map[string]any{"name": "Draft", "definition": map[string]any{"schemaVersion": 1, "nodes": []any{}}}, "session", false), 403)
	draft := request("POST", "/api/v1/scripts", map[string]any{"name": "Draft", "definition": map[string]any{"schemaVersion": 1, "nodes": []any{}}}, "key", false)
	check(draft, 201)
	if decodeMap(draft)["runnable"] != false {
		t.Fatal("empty draft runnable")
	}
	fixtures, e := os.ReadFile("../../contract/conversation-fixtures.json")
	if e != nil {
		t.Fatal(e)
	}
	var fs []struct {
		Definition json.RawMessage `json:"definition"`
		Steps      []struct {
			Expected any `json:"expected"`
		} `json:"steps"`
	}
	_ = json.Unmarshal(fixtures, &fs)
	definition := fs[1].Definition
	created := request("POST", "/api/v1/scripts", map[string]any{"name": "Sensitive sample script", "definition": definition}, "key", false)
	check(created, 201)
	script := decodeMap(created)
	id := script["id"].(string)
	check(request("PUT", "/api/v1/scripts/"+id, map[string]any{"expectedRevision": 1, "name": "Changed", "definition": map[string]any{"schemaVersion": 2, "nodes": []any{}}}, "key", false), 422)
	check(request("PUT", "/api/v1/scripts/"+id, map[string]any{"expectedRevision": 99, "name": "Stale", "definition": definition}, "key", false), 409)
	copy := request("POST", "/api/v1/scripts/"+id+"/duplicate", map[string]any{"name": "Copy"}, "session", true)
	check(copy, 201)
	if decodeMap(copy)["revision"] != float64(1) || decodeMap(copy)["lastExecutedAt"] != nil {
		t.Fatal("duplicate identity")
	}
	createBody := map[string]any{"scriptId": id, "expectedScriptRevision": 1, "lead": map[string]any{"name": "Private lead", "company": "Private company", "phone": "  local 123  "}, "clientRequestId": ID()}
	first := request("POST", "/api/v1/runs", createBody, "session", true)
	check(first, 201)
	run := decodeMap(first)
	runID := run["id"].(string)
	repeat := request("POST", "/api/v1/runs", createBody, "session", true)
	check(repeat, 200)
	if decodeMap(repeat)["id"] != runID {
		t.Fatal("creation duplicated")
	}
	createBody["clientRequestId"] = ID()
	other := request("POST", "/api/v1/runs", createBody, "session", true)
	check(other, 201)
	otherID := decodeMap(other)["id"].(string)
	state := map[string]any{"expectedRevision": 1, "progress": fs[1].Steps[1].Expected, "callNotes": "Private notes", "phase": "in_progress", "outcome": nil, "evaluationNotes": ""}
	check(request("PUT", "/api/v1/runs/"+runID+"/state", state, "session", true), 200)
	check(request("PUT", "/api/v1/runs/"+runID+"/state", state, "session", true), 409)
	state["expectedRevision"] = 2
	state["progress"] = map[string]any{"groups": []any{}, "activeGroupIndex": 0, "choices": map[string]any{}, "retainedNodeIds": []any{"fabricated"}}
	check(request("PUT", "/api/v1/runs/"+runID+"/state", state, "session", true), 422)
	state["progress"] = fs[1].Steps[1].Expected
	state["phase"] = "evaluating"
	check(request("PUT", "/api/v1/runs/"+runID+"/state", state, "session", true), 200)
	state["expectedRevision"] = 3
	state["idempotencyKey"] = ID()
	check(request("POST", "/api/v1/runs/"+runID+"/complete", state, "session", true), 422)
	state["outcome"] = "success"
	completed := request("POST", "/api/v1/runs/"+runID+"/complete", state, "session", true)
	check(completed, 200)
	retry := request("POST", "/api/v1/runs/"+runID+"/complete", state, "session", true)
	check(retry, 200)
	if decodeMap(completed)["completedAt"] != decodeMap(retry)["completedAt"] {
		t.Fatal("completion changed timestamp")
	}
	state["idempotencyKey"] = ID()
	check(request("POST", "/api/v1/runs/"+runID+"/complete", state, "session", true), 409)
	check(request("DELETE", "/api/v1/scripts/"+id, nil, "key", false), 403)
	check(request("DELETE", "/api/v1/scripts/"+id, nil, "session", true), 200)
	preserved := request("GET", "/api/v1/runs/"+runID, nil, "session", false)
	check(preserved, 200)
	if decodeMap(preserved)["scriptName"] != "Sensitive sample script" {
		t.Fatal("snapshot changed")
	}
	check(request("GET", "/api/v1/run-script-options", nil, "session", false), 200)
	check(request("GET", "/api/v1/runs?scriptId="+id, nil, "session", false), 200)
	check(request("GET", "/api/v1/runs/"+otherID, nil, "session", false), 200)
	check(request("DELETE", "/api/v1/runs/"+runID, nil, "session", true), 200)
	delete(state, "idempotencyKey")
	check(request("PUT", "/api/v1/runs/"+runID+"/state", state, "session", true), 404)
	for _, secret := range []string{password, key, "Private lead", "Private notes", "Sensitive sample script"} {
		if strings.Contains(logs.String(), secret) {
			t.Fatal("sensitive value leaked in logs")
		}
	}
	if binary := os.Getenv("MCP_BINARY"); binary != "" {
		httpServer := httptest.NewServer(handler)
		defer httpServer.Close()
		command := exec.Command(binary)
		command.Stderr = os.Stderr
		command.Env = append(os.Environ(), "CALL_COACH_URL="+httpServer.URL, "CALL_COACH_API_KEY="+key)
		client := mcp.NewClient(&mcp.Implementation{Name: "integration-test", Version: "1"}, nil)
		session, err := client.Connect(ctx, &mcp.CommandTransport{Command: command}, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer session.Close()
		tools, err := session.ListTools(ctx, nil)
		if err != nil || len(tools.Tools) != 5 {
			t.Fatalf("tool negotiation failed: %v", err)
		}
		call := func(name string, args map[string]any) map[string]any {
			t.Helper()
			result, err := session.CallTool(ctx, &mcp.CallToolParams{Name: name, Arguments: args})
			if err != nil || result.IsError {
				t.Fatalf("MCP %s failed: %v %+v", name, err, result)
			}
			var data map[string]any
			if err = json.Unmarshal([]byte(result.Content[0].(*mcp.TextContent).Text), &data); err != nil {
				t.Fatal(err)
			}
			return data
		}
		call("get_script_schema", map[string]any{})
		draft := map[string]any{"schemaVersion": 1, "nodes": []any{}}
		created := call("create_script", map[string]any{"name": "MCP draft", "definition": draft})
		mid := created["id"].(string)
		call("get_script", map[string]any{"scriptId": mid})
		call("list_scripts", map[string]any{"sort": "name", "order": "asc", "page": 1, "pageSize": 50})
		updated := call("update_script", map[string]any{"scriptId": mid, "expectedRevision": 1, "name": "MCP replacement", "definition": draft})
		if updated["name"] != "MCP replacement" {
			t.Fatal("MCP update not persisted")
		}
	}

	check(request("POST", "/api/v1/auth/logout", nil, "session", true), 200)
	check(request("GET", "/api/v1/auth/session", nil, "session", false), 401)
	for i := 0; i < 10; i++ {
		check(request("POST", "/api/v1/auth/login", map[string]any{"password": "incorrect"}, "", true), 401)
	}
	check(request("POST", "/api/v1/auth/login", map[string]any{"password": password}, "", true), 429)
}
