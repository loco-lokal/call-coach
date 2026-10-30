package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"callcoach/contract"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

func main() {
	base := strings.TrimRight(os.Getenv("CALL_COACH_URL"), "/")
	u, e := url.Parse(base)
	if e != nil || u.Host == "" || u.User != nil || (u.Scheme != "http" && u.Scheme != "https") || u.RawQuery != "" || u.Fragment != "" {
		fmt.Fprintln(os.Stderr, "Set CALL_COACH_URL to the application’s HTTP(S) origin.")
		os.Exit(1)
	}
	key := os.Getenv("CALL_COACH_API_KEY")
	if key == "" {
		fmt.Fprintln(os.Stderr, "Set CALL_COACH_API_KEY.")
		os.Exit(1)
	}
	client := &http.Client{Timeout: 30 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	s := mcp.NewServer(&mcp.Implementation{Name: "call-coach", Version: "1.0.0"}, nil)
	var definition map[string]any
	_ = json.Unmarshal(contract.Schema, &definition)
	text := func(desc string) map[string]any { return map[string]any{"type": "string", "description": desc} }
	for _, name := range []string{"list_scripts", "get_script", "create_script", "update_script", "get_script_schema"} {
		props := map[string]any{}
		required := []string{}
		description := ""
		switch name {
		case "list_scripts":
			description = "List scripts with revisions and validation. Invalid drafts are included."
			props = map[string]any{"sort": map[string]any{"enum": []string{"name", "updatedAt"}}, "order": map[string]any{"enum": []string{"asc", "desc"}}, "page": map[string]any{"type": "integer", "minimum": 1}, "pageSize": map[string]any{"type": "integer", "minimum": 1, "maximum": 100}}
		case "get_script":
			description = "Read a script before editing it."
			props["scriptId"] = text("Script UUID.")
			required = []string{"scriptId"}
		case "create_script", "update_script":
			description = "Save the complete schemaVersion 1 definition. Graph-invalid drafts are allowed; no approval step. Omitted nodes and connections are removed. Review validation before starting a call."
			props["name"] = text("Script display name; not globally unique.")
			props["definition"] = definition
			required = []string{"name", "definition"}
			if name == "update_script" {
				props["scriptId"] = text("Script UUID.")
				props["expectedRevision"] = map[string]any{"type": "integer", "minimum": 1, "description": "Revision from get_script. On409 reload and review before replacement."}
				required = append(required, "scriptId", "expectedRevision")
			}
		case "get_script_schema":
			description = "Read bundled schemaVersion 1 and graph constraints; no server data."
		}
		input := map[string]any{"type": "object", "properties": props, "required": required, "additionalProperties": false}
		encodedInput, _ := json.Marshal(input)
		var inputDocument any
		_ = json.Unmarshal(encodedInput, &inputDocument)
		compiler := jsonschema.NewCompiler()
		if err := compiler.AddResource("tool.json", inputDocument); err != nil {
			panic(err)
		}
		validator, err := compiler.Compile("tool.json")
		if err != nil {
			panic(err)
		}
		s.AddTool(&mcp.Tool{Name: name, Description: description, InputSchema: input}, func(ctx context.Context, req *mcp.CallToolRequest) (*mcp.CallToolResult, error) {
			args := map[string]any{}
			if len(req.Params.Arguments) > 0 {
				if json.Unmarshal(req.Params.Arguments, &args) != nil {
					return result([]byte(`{"error":{"code":"INVALID_JSON","message":"Invalid tool arguments."}}`), true), nil
				}
			}
			if err := validator.Validate(args); err != nil {
				return result([]byte(`{"error":{"code":"INVALID_INPUT","message":"Arguments do not match the tool schema."}}`), true), nil
			}
			if name == "get_script_schema" {
				return result(contract.Schema, false), nil
			}
			method, path := "GET", "/api/v1/scripts"
			switch name {
			case "list_scripts":
				q := url.Values{}
				for k, v := range args {
					q.Set(k, fmt.Sprint(v))
				}
				path += "?" + q.Encode()
			case "get_script":
				path += "/" + url.PathEscape(args["scriptId"].(string))
			case "create_script":
				method = "POST"
			case "update_script":
				method = "PUT"
				path += "/" + url.PathEscape(args["scriptId"].(string))
				delete(args, "scriptId")
			}
			var body io.Reader
			if method != "GET" {
				data, _ := json.Marshal(args)
				body = bytes.NewReader(data)
			}
			request, err := http.NewRequestWithContext(ctx, method, base+path, body)
			if err != nil {
				return nil, fmt.Errorf("could not create API request")
			}
			request.Header.Set("Authorization", "Bearer "+key)
			request.Header.Set("Content-Type", "application/json")
			resp, err := client.Do(request)
			if err != nil {
				return result([]byte(`{"error":{"code":"UNAVAILABLE","message":"Could not reach Call Coach."}}`), true), nil
			}
			defer resp.Body.Close()
			data, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
			if err != nil {
				return nil, fmt.Errorf("could not read API response")
			}
			return result(data, resp.StatusCode >= 300), nil
		})
	}
	if err := s.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		fmt.Fprintln(os.Stderr, "MCP session ended with an error.")
		os.Exit(1)
	}
}
func result(data []byte, failed bool) *mcp.CallToolResult {
	var structured map[string]any
	_ = json.Unmarshal(data, &structured)
	return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: string(data)}}, StructuredContent: structured, IsError: failed}
}
