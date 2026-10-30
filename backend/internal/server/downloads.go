package server

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"callcoach/contract"
)

func (s *Server) download(w http.ResponseWriter, r *http.Request, name string) (int, error) {
	switch name {
	case "openapi":
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Content-Disposition", `attachment; filename="call-coach-openapi.json"`)
		w.WriteHeader(200)
		_, _ = w.Write(contract.OpenAPI)
		return 200, nil
	case "script-schema":
		w.Header().Set("Content-Type", "application/schema+json")
		w.Header().Set("Content-Disposition", `attachment; filename="call-coach-script.schema.json"`)
		w.WriteHeader(200)
		_, _ = w.Write(contract.Schema)
		return 200, nil
	case "mcp-config":
		w.Header().Set("Content-Disposition", `attachment; filename="call-coach-mcp.json"`)
		write(w, 200, map[string]any{"mcpServers": map[string]any{"call-coach": map[string]any{"command": "/absolute/path/to/call-coach-mcp", "env": map[string]string{"CALL_COACH_URL": s.cfg.PublicURL, "CALL_COACH_API_KEY": s.cfg.APIKey}}}})
		return 200, nil
	}
	target := strings.TrimPrefix(name, "mcp-downloads/")
	allowed := map[string]bool{"darwin-amd64": true, "darwin-arm64": true, "linux-amd64": true, "linux-arm64": true, "windows-amd64": true}
	if !strings.HasPrefix(name, "mcp-downloads/") || !allowed[target] {
		return 0, fail(404, "NOT_FOUND", "Choose a supported build target.")
	}
	filename := "call-coach-mcp-" + target
	if strings.HasPrefix(target, "windows") {
		filename += ".exe"
	}
	path := filepath.Join(s.cfg.BinaryDir, filename)
	if _, e := os.Stat(path); e != nil {
		return 0, fail(503, "DOWNLOAD_UNAVAILABLE", "This release’s executable is not available.")
	}
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.Header().Set("Content-Type", "application/octet-stream")
	http.ServeFile(w, r, path)
	return 200, nil
}
