package server

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/jackc/pgx/v5/pgconn"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	Password, APIKey, PublicURL, BinaryDir string
	Secure                                 bool
	TTL                                    time.Duration
}
type Server struct {
	DB       *pgxpool.Pool
	cfg      Config
	password []byte
	mu       sync.Mutex
	attempts map[string][]time.Time
}
type APIError struct {
	Code            string `json:"code"`
	Message         string `json:"message"`
	CurrentRevision int64  `json:"currentRevision,omitempty"`
	Fields          any    `json:"fields,omitempty"`
}
type failure struct {
	status int
	detail APIError
}

func fail(status int, code, msg string) error {
	return &failure{status, APIError{Code: code, Message: msg}}
}
func (e *failure) Error() string { return e.detail.Message }
func conflict(rev int64) error {
	return &failure{409, APIError{Code: "REVISION_CONFLICT", Message: "This record changed after it was loaded. Review the saved version before replacing it.", CurrentRevision: rev}}
}
func New(db *pgxpool.Pool, cfg Config) (*Server, error) {
	if len(cfg.Password) < 12 || len(cfg.APIKey) < 32 || len(cfg.Password) > 72 {
		return nil, errors.New("Configure a password of 12–72 bytes and an API key of at least 32 bytes")
	}
	u, e := url.Parse(cfg.PublicURL)
	if e != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return nil, errors.New("PUBLIC_APP_URL must be an absolute HTTP(S) origin")
	}
	cfg.PublicURL = strings.TrimRight(cfg.PublicURL, "/")
	if u.Scheme == "https" && !cfg.Secure {
		return nil, errors.New("HTTPS requires COOKIE_SECURE=true")
	}
	if cfg.TTL == 0 {
		cfg.TTL = 24 * time.Hour
	}
	hash, e := bcrypt.GenerateFromPassword([]byte(cfg.Password), bcrypt.DefaultCost)
	if e != nil {
		return nil, e
	}
	cfg.Password = ""
	return &Server{DB: db, cfg: cfg, password: hash, attempts: map[string][]time.Time{}}, nil
}
func ID() string {
	b := make([]byte, 16)
	if _, e := rand.Read(b); e != nil {
		panic(e)
	}
	b[6] = (b[6] & 15) | 64
	b[8] = (b[8] & 63) | 128
	h := hex.EncodeToString(b)
	return h[:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:]
}
func hash(s string) string { h := sha256.Sum256([]byte(s)); return hex.EncodeToString(h[:]) }
func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
func decode(r *http.Request, v any) error {
	d := json.NewDecoder(io.LimitReader(r.Body, 3<<20))
	d.DisallowUnknownFields()
	if e := d.Decode(v); e != nil {
		return fail(400, "INVALID_JSON", "Send a valid JSON request with supported fields.")
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		return fail(400, "INVALID_JSON", "Send one JSON object.")
	}
	return nil
}
func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		requestID := ID()
		w.Header().Set("X-Request-ID", requestID)
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Content-Security-Policy", "default-src 'none'")
		defer func() {
			if recover() != nil {
				slog.Error("request panic", "requestId", requestID)
				write(w, 500, map[string]any{"error": APIError{Code: "INTERNAL_ERROR", Message: "The request could not be completed."}})
			}
		}()
		operation := "unknown"
		for _, section := range []string{"auth", "scripts", "runs", "run-script-options", "docs"} {
			if strings.HasPrefix(r.URL.Path, "/api/v1/"+section) {
				operation = section
				break
			}
		}
		outcome := "ok"
		status, e := s.route(w, r)
		if e != nil {
			var f *failure
			if !errors.As(e, &f) {
				if errors.Is(e, pgx.ErrNoRows) {
					f = &failure{404, APIError{Code: "NOT_FOUND", Message: "This record is unavailable."}}
				} else {
					slog.Error("request failed", "requestId", requestID, "operation", r.Method, "errorType", fmt.Sprintf("%T", e))
					var pgError *pgconn.PgError
					if errors.As(e, &pgError) {
						slog.Error("database operation failed", "requestId", requestID, "sqlState", pgError.Code)
					}
					f = &failure{503, APIError{Code: "UNAVAILABLE", Message: "Storage is temporarily unavailable. Your local work is kept."}}
				}
			}
			status = f.status
			outcome = f.detail.Code
			write(w, status, map[string]any{"error": f.detail})
		}
		slog.Info("request", "requestId", requestID, "operation", r.Method+" "+operation, "outcome", outcome, "status", status, "latencyMs", time.Since(start).Milliseconds())
	})
}
func (s *Server) auth(r *http.Request, allowKey bool) (bool, error) {
	if h := r.Header.Get("Authorization"); h != "" {
		got := sha256.Sum256([]byte(strings.TrimPrefix(h, "Bearer ")))
		want := sha256.Sum256([]byte(s.cfg.APIKey))
		if !strings.HasPrefix(h, "Bearer ") || subtle.ConstantTimeCompare(got[:], want[:]) != 1 {
			return false, fail(401, "UNAUTHENTICATED", "A valid API key is required.")
		}
		if !allowKey {
			return false, fail(403, "FORBIDDEN", "API keys can only list, read, create, and update scripts.")
		}
		return true, nil
	}
	c, e := r.Cookie("call_coach_session")
	if e != nil {
		return false, fail(401, "UNAUTHENTICATED", "Sign in to continue.")
	}
	var valid bool
	e = s.DB.QueryRow(r.Context(), "SELECT EXISTS(SELECT 1 FROM sessions WHERE token_hash=$1 AND expires_at>now())", hash(c.Value)).Scan(&valid)
	if e != nil {
		return false, e
	}
	if !valid {
		return false, fail(401, "UNAUTHENTICATED", "Your session expired. Sign in to continue.")
	}
	if r.Method != "GET" && r.Header.Get("Origin") != s.cfg.PublicURL {
		return false, fail(403, "INVALID_ORIGIN", "This request must come from the application origin.")
	}
	return false, nil
}

var uuid = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func (s *Server) route(w http.ResponseWriter, r *http.Request) (int, error) {
	ctx := r.Context()
	path := strings.TrimSuffix(r.URL.Path, "/")
	method := r.Method
	if path == "/healthz" && method == "GET" {
		write(w, 200, map[string]string{"status": "ok"})
		return 200, nil
	}
	if path == "/readyz" && method == "GET" {
		var v int
		if e := s.DB.QueryRow(ctx, "SELECT version FROM schema_migrations WHERE version=1").Scan(&v); e != nil {
			return 503, fail(503, "NOT_READY", "Application is not ready.")
		}
		write(w, 200, map[string]string{"status": "ready"})
		return 200, nil
	}
	if path == "/api/v1/auth/login" && method == "POST" {
		return s.login(w, r)
	}
	parts := strings.Split(strings.TrimPrefix(path, "/api/v1/"), "/")
	allowKey := len(parts) > 0 && parts[0] == "scripts" && ((len(parts) == 1 && (method == "GET" || method == "POST")) || (len(parts) == 2 && (method == "GET" || method == "PUT")))
	if _, e := s.auth(r, allowKey); e != nil {
		return 0, e
	}
	if path == "/api/v1/auth/session" && method == "GET" {
		write(w, 200, map[string]bool{"authenticated": true})
		return 200, nil
	}
	if path == "/api/v1/auth/logout" && method == "POST" {
		c, _ := r.Cookie("call_coach_session")
		if c != nil {
			if _, e := s.DB.Exec(ctx, "DELETE FROM sessions WHERE token_hash=$1", hash(c.Value)); e != nil {
				return 0, e
			}
		}
		http.SetCookie(w, &http.Cookie{Name: "call_coach_session", Path: "/", HttpOnly: true, Secure: s.cfg.Secure, SameSite: http.SameSiteStrictMode, MaxAge: -1})
		write(w, 200, map[string]bool{"authenticated": false})
		return 200, nil
	}
	if len(parts) == 1 && parts[0] == "scripts" {
		if method == "GET" {
			return s.listScripts(w, r)
		}
		if method == "POST" {
			return s.saveScript(w, r, "")
		}
	}
	if len(parts) >= 2 && (parts[0] == "scripts" || parts[0] == "runs") {
		if !uuid.MatchString(parts[1]) {
			return 0, fail(404, "NOT_FOUND", "This record is unavailable.")
		}
	}
	if len(parts) == 2 && parts[0] == "scripts" {
		switch method {
		case "GET":
			v, e := getScript(ctx, s.DB, parts[1], false)
			if e != nil {
				return 0, e
			}
			write(w, 200, v)
			return 200, nil
		case "PUT":
			return s.saveScript(w, r, parts[1])
		case "DELETE":
			tag, e := s.DB.Exec(ctx, "UPDATE scripts SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL", parts[1])
			if e != nil {
				return 0, e
			}
			if tag.RowsAffected() == 0 {
				return 0, pgx.ErrNoRows
			}
			write(w, 200, map[string]bool{"deleted": true})
			return 200, nil
		}
	}
	if len(parts) == 3 && parts[0] == "scripts" && parts[2] == "duplicate" && method == "POST" {
		return s.duplicate(w, r, parts[1])
	}
	if len(parts) == 1 && parts[0] == "runs" {
		if method == "POST" {
			return s.createRun(w, r)
		}
		if method == "GET" {
			return s.listRuns(w, r)
		}
	}
	if path == "/api/v1/run-script-options" && method == "GET" {
		rows, e := s.DB.Query(ctx, `SELECT id::text,name FROM scripts WHERE deleted_at IS NULL UNION ALL SELECT source_script_id::text,script_name FROM (SELECT DISTINCT ON (source_script_id) source_script_id,script_name FROM runs ORDER BY source_script_id,started_at DESC,id DESC) recent WHERE source_script_id NOT IN (SELECT id FROM scripts WHERE deleted_at IS NULL) ORDER BY 2,1`)
		if e != nil {
			return 0, e
		}
		defer rows.Close()
		items := []map[string]string{}
		for rows.Next() {
			var id, name string
			if e = rows.Scan(&id, &name); e != nil {
				return 0, e
			}
			items = append(items, map[string]string{"id": id, "name": name})
		}
		if rows.Err() != nil {
			return 0, rows.Err()
		}
		write(w, 200, map[string]any{"items": items})
		return 200, nil
	}
	if len(parts) == 2 && parts[0] == "runs" {
		if method == "GET" {
			v, e := getRun(ctx, s.DB, parts[1], false)
			if e != nil {
				return 0, e
			}
			write(w, 200, v)
			return 200, nil
		}
		if method == "DELETE" {
			tag, e := s.DB.Exec(ctx, "DELETE FROM runs WHERE id=$1", parts[1])
			if e != nil {
				return 0, e
			}
			if tag.RowsAffected() == 0 {
				return 0, pgx.ErrNoRows
			}
			write(w, 200, map[string]bool{"deleted": true})
			return 200, nil
		}
	}
	if len(parts) == 3 && parts[0] == "runs" && ((parts[2] == "state" && method == "PUT") || (parts[2] == "complete" && method == "POST")) {
		return s.updateRun(w, r, parts[1], parts[2] == "complete")
	}
	if strings.HasPrefix(path, "/api/v1/docs/") && method == "GET" {
		return s.download(w, r, strings.TrimPrefix(path, "/api/v1/docs/"))
	}
	return 0, fail(404, "NOT_FOUND", "This endpoint is unavailable.")
}
func (s *Server) login(w http.ResponseWriter, r *http.Request) (int, error) {
	if r.Header.Get("Origin") != s.cfg.PublicURL {
		return 0, fail(403, "INVALID_ORIGIN", "Sign in through the application origin.")
	}
	host, _, _ := net.SplitHostPort(r.RemoteAddr)
	now := time.Now()
	s.mu.Lock()
	times := []time.Time{}
	for _, t := range s.attempts[host] {
		if now.Sub(t) < time.Minute {
			times = append(times, t)
		}
	}
	if len(times) >= 10 {
		s.mu.Unlock()
		w.Header().Set("Retry-After", "60")
		return 0, fail(429, "RATE_LIMITED", "Too many attempts. Wait a minute and try again.")
	}
	s.attempts[host] = append(times, now)
	if len(s.attempts) > 10000 {
		for ip, ts := range s.attempts {
			if len(ts) == 0 || now.Sub(ts[len(ts)-1]) > time.Minute {
				delete(s.attempts, ip)
			}
		}
	}
	s.mu.Unlock()
	var body struct {
		Password string `json:"password"`
	}
	if e := decode(r, &body); e != nil {
		return 0, e
	}
	if bcrypt.CompareHashAndPassword(s.password, []byte(body.Password)) != nil {
		return 0, fail(401, "UNAUTHENTICATED", "That password did not match.")
	}
	s.mu.Lock()
	delete(s.attempts, host)
	s.mu.Unlock()
	token := ID() + ID()
	if _, e := s.DB.Exec(r.Context(), "INSERT INTO sessions(token_hash,expires_at) VALUES($1,$2)", hash(token), now.Add(s.cfg.TTL)); e != nil {
		return 0, e
	}
	_, _ = s.DB.Exec(r.Context(), "DELETE FROM sessions WHERE expires_at<now()")
	http.SetCookie(w, &http.Cookie{Name: "call_coach_session", Value: token, Path: "/", HttpOnly: true, Secure: s.cfg.Secure, SameSite: http.SameSiteStrictMode, MaxAge: int(s.cfg.TTL.Seconds())})
	write(w, 200, map[string]bool{"authenticated": true})
	return 200, nil
}
func pagination(r *http.Request) (int, int) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	size, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	if page < 1 {
		page = 1
	}
	if size < 1 {
		size = 50
	}
	if size > 100 {
		size = 100
	}
	if page > 100000 {
		page = 100000
	}
	return page, size
}
func validName(name string) bool {
	return strings.TrimSpace(name) != "" && utf8.RuneCountInString(name) <= 200
}
