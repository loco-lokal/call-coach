package domain

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func ptr(s string) *string { return &s }
func valid() Definition {
	return Definition{SchemaVersion: 1, Nodes: []Node{{ID: "a", Type: "talking_point", IsStart: true, Text: "Hello", Next: ptr("s")}, {ID: "s", Type: "switch", Name: "Choice", Options: []Option{{ID: "yes", Label: "Yes", Target: ptr("b")}, {ID: "no", Label: "No", Target: ptr("c")}}}, {ID: "b", Type: "talking_point", Text: "Why?", Next: ptr("end")}, {ID: "c", Type: "talking_point", Text: "Okay", Next: ptr("end")}, {ID: "end", Type: "talking_point", Text: "Thanks"}}}
}
func TestGraphValidation(t *testing.T) {
	cases := []struct {
		name, code string
		mutate     func(*Definition)
	}{
		{"valid merge", "", func(*Definition) {}}, {"no start", "MISSING_START", func(d *Definition) { d.Nodes[0].IsStart = false }}, {"two starts", "MULTIPLE_STARTS", func(d *Definition) { d.Nodes[2].IsStart = true }}, {"duplicate", "DUPLICATE_NODE_ID", func(d *Definition) { d.Nodes[2].ID = "a" }}, {"cycle", "CYCLE", func(d *Definition) { d.Nodes[4].Next = ptr("a") }}, {"dangling", "UNKNOWN_TARGET", func(d *Definition) { d.Nodes[2].Next = ptr("missing") }}, {"unreachable", "UNREACHABLE_NODE", func(d *Definition) {
			d.Nodes = append(d.Nodes, Node{ID: "orphan", Type: "talking_point", Text: "Alone"})
		}}, {"empty text", "EMPTY_TEXT", func(d *Definition) { d.Nodes[2].Text = "  " }}, {"empty switch", "EMPTY_SWITCH_NAME", func(d *Definition) { d.Nodes[1].Name = "" }}, {"few options", "TOO_FEW_OPTIONS", func(d *Definition) { d.Nodes[1].Options = d.Nodes[1].Options[:1] }}, {"duplicate option", "DUPLICATE_OPTION_ID", func(d *Definition) { d.Nodes[1].Options[1].ID = "yes" }}, {"label", "EMPTY_OPTION_LABEL", func(d *Definition) { d.Nodes[1].Options[0].Label = "" }}, {"missing target", "MISSING_OPTION_TARGET", func(d *Definition) { d.Nodes[1].Options[0].Target = nil }}, {"consecutive", "CONSECUTIVE_SWITCHES", func(d *Definition) { d.Nodes[1].Options[0].Target = ptr("s") }},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			d := valid()
			tc.mutate(&d)
			issues := Validate(d)
			if tc.code == "" {
				if len(issues) != 0 {
					t.Fatal(issues)
				}
				return
			}
			for _, i := range issues {
				if i.Code == tc.code {
					return
				}
			}
			t.Fatalf("missing %s: %+v", tc.code, issues)
		})
	}
}
func TestSchemaRejectsWithoutCoercion(t *testing.T) {
	for _, raw := range []string{`{"schemaVersion":2,"nodes":[]}`, `{"schemaVersion":1,"nodes":[{"id":"x","type":"unknown"}]}`, `{"schemaVersion":1,"nodes":[],"arbitrary":true}`, `{"schemaVersion":1,"nodes":[{"id":"x","type":"talking_point","isStart":true,"text":12,"next":null}]}`} {
		if _, e := Parse(json.RawMessage(raw)); e == nil {
			t.Fatal(raw)
		}
	}
	if _, e := Parse(json.RawMessage(`{"schemaVersion":1,"nodes":[]}`)); e != nil {
		t.Fatal(e)
	}
}
func TestSharedCheckpoints(t *testing.T) {
	raw, e := os.ReadFile("../../contract/conversation-fixtures.json")
	if e != nil {
		t.Fatal(e)
	}
	var fixtures []struct {
		Name       string          `json:"name"`
		Definition json.RawMessage `json:"definition"`
		Steps      []struct {
			Expected Progress `json:"expected"`
		} `json:"steps"`
	}
	if e = json.Unmarshal(raw, &fixtures); e != nil {
		t.Fatal(e)
	}
	for _, f := range fixtures {
		t.Run(f.Name, func(t *testing.T) {
			d, e := Parse(f.Definition)
			if e != nil {
				t.Fatal(e)
			}
			if len(Validate(d)) != 0 {
				t.Fatal(Validate(d))
			}
			for _, step := range f.Steps {
				if e = ValidateProgress(d, step.Expected); e != nil {
					t.Fatalf("%+v: %s", step.Expected, e)
				}
				bad := step.Expected
				bad.Retained = append(append([]string{}, bad.Retained...), "unseen")
				if ValidateProgress(d, bad) == nil {
					t.Fatal("accepted fabricated retained path")
				}
			}
		})
	}
}

func TestStartErrorsPrecedeIndependentErrors(t *testing.T) {
	for _, d := range []Definition{{SchemaVersion: 1, Nodes: []Node{}}, {SchemaVersion: 1, Nodes: []Node{{ID: "a", Type: "talking_point", IsStart: true}, {ID: "b", Type: "talking_point", IsStart: true}}}} {
		issues := Validate(d)
		if len(issues) == 0 || (issues[0].Code != "MISSING_START" && issues[0].Code != "MULTIPLE_STARTS") {
			t.Fatal(issues)
		}
		for _, issue := range issues {
			if issue.Code == "UNREACHABLE_NODE" {
				t.Fatal("invented a unique start for reachability")
			}
		}
	}
}

func TestRemovedQuestionCompatibility(t *testing.T) {
	raw := json.RawMessage(`{"schemaVersion":1,"nodes":[{"id":"old","type":"question","isStart":true,"text":"Why?","next":null}],"layout":{"positions":{"old":{"x":12,"y":24}}}}`)
	if _, err := Parse(raw); err == nil {
		t.Fatal("new Question writes must be rejected")
	}
	normalized := NormalizeStored(raw)
	d, err := Parse(normalized)
	if err != nil {
		t.Fatal(err)
	}
	if d.Nodes[0].Type != "talking_point" || d.Nodes[0].ID != "old" || d.Nodes[0].Text != "Why?" {
		t.Fatal("legacy content changed")
	}
	if !strings.Contains(string(raw), `"question"`) || !strings.Contains(string(normalized), `"x":12`) {
		t.Fatal("raw snapshot or layout changed")
	}
	if len(Validate(d)) != 0 {
		t.Fatal("legacy terminal Talking point should be valid")
	}
}
