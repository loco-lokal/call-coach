package domain

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"callcoach/contract"
	"github.com/santhosh-tekuri/jsonschema/v6"
)

type Option struct {
	ID     string  `json:"id"`
	Label  string  `json:"label"`
	Target *string `json:"target"`
}
type Node struct {
	ID      string   `json:"id"`
	Type    string   `json:"type"`
	IsStart bool     `json:"isStart"`
	Text    string   `json:"text,omitempty"`
	Next    *string  `json:"next,omitempty"`
	Name    string   `json:"name,omitempty"`
	Options []Option `json:"options,omitempty"`
}
type Definition struct {
	SchemaVersion int             `json:"schemaVersion"`
	Nodes         []Node          `json:"nodes"`
	Layout        json.RawMessage `json:"layout,omitempty"`
}
type Issue struct {
	Code     string `json:"code"`
	Message  string `json:"message"`
	NodeID   string `json:"nodeId,omitempty"`
	OptionID string `json:"optionId,omitempty"`
	Field    string `json:"field,omitempty"`
}
type Group struct {
	First  string `json:"firstNodeId"`
	Second string `json:"secondNodeId,omitempty"`
}
type Progress struct {
	Groups   []Group           `json:"groups"`
	Active   int               `json:"activeGroupIndex"`
	Choices  map[string]string `json:"choices"`
	Retained []string          `json:"retainedNodeIds"`
}

var schema *jsonschema.Schema

func init() {
	c := jsonschema.NewCompiler()
	var v any
	if err := json.Unmarshal(contract.Schema, &v); err != nil {
		panic(err)
	}
	if err := c.AddResource("script.json", v); err != nil {
		panic(err)
	}
	var err error
	schema, err = c.Compile("script.json")
	if err != nil {
		panic(err)
	}
}
func Parse(raw json.RawMessage) (Definition, error) {
	var v any
	var d Definition
	if len(raw) > 2<<20 {
		return d, errors.New("Definition exceeds 2 MiB.")
	}
	if json.Unmarshal(raw, &v) != nil {
		return d, errors.New("Invalid definition JSON.")
	}
	if err := schema.Validate(v); err != nil {
		return d, fmt.Errorf("Definition does not match schemaVersion 1: %s", err)
	}
	err := json.Unmarshal(raw, &d)
	return d, err
}

// NormalizeStored adapts pre-removal Question nodes at the read boundary.
// Saved snapshots stay untouched; identities, text, layout and links are retained.
// New writes still pass the canonical schema and cannot introduce Question nodes.
func NormalizeStored(raw json.RawMessage) json.RawMessage {
	var value map[string]json.RawMessage
	var nodes []map[string]json.RawMessage
	if json.Unmarshal(raw, &value) != nil || json.Unmarshal(value["nodes"], &nodes) != nil {
		return raw
	}
	changed := false
	for _, node := range nodes {
		var kind string
		if json.Unmarshal(node["type"], &kind) == nil && kind == "question" {
			node["type"] = json.RawMessage(`"talking_point"`)
			changed = true
		}
	}
	if !changed {
		return raw
	}
	value["nodes"], _ = json.Marshal(nodes)
	normalized, err := json.Marshal(value)
	if err != nil {
		return raw
	}
	return normalized
}
func (d Definition) Index() map[string]Node {
	m := map[string]Node{}
	for _, n := range d.Nodes {
		m[n.ID] = n
	}
	return m
}
func targets(n Node) []string {
	a := []string{}
	if n.Type == "switch" {
		for _, o := range n.Options {
			if o.Target != nil {
				a = append(a, *o.Target)
			}
		}
	} else if n.Next != nil {
		a = append(a, *n.Next)
	}
	return a
}
func Validate(d Definition) []Issue {
	out := []Issue{}
	add := func(code, msg string, n Node, oid, field string) {
		out = append(out, Issue{code, msg, n.ID, oid, field})
	}
	m := d.Index()
	starts := []Node{}
	for _, n := range d.Nodes {
		if n.IsStart {
			starts = append(starts, n)
		}
	}
	if len(starts) == 0 {
		out = append(out, Issue{Code: "MISSING_START", Message: "Mark one node as the conversation start."})
	} else if len(starts) > 1 {
		out = append(out, Issue{Code: "MULTIPLE_STARTS", Message: "Mark exactly one conversation start."})
	}
	if len(d.Nodes) == 0 {
		out = append(out, Issue{Code: "EMPTY_SCRIPT", Message: "Add a node to begin."})
	}
	ids := map[string]bool{}
	for _, n := range d.Nodes {
		if ids[n.ID] {
			add("DUPLICATE_NODE_ID", "Node IDs must be unique.", n, "", "id")
		}
		ids[n.ID] = true
		if n.Type != "switch" {
			if strings.TrimSpace(n.Text) == "" {
				add("EMPTY_TEXT", "Write this node’s text.", n, "", "text")
			}
		} else {
			if strings.TrimSpace(n.Name) == "" {
				add("EMPTY_SWITCH_NAME", "Give the switch a name.", n, "", "name")
			}
			if len(n.Options) < 2 {
				add("TOO_FEW_OPTIONS", "Add at least two options.", n, "", "options")
			}
			opts := map[string]bool{}
			for _, o := range n.Options {
				f := "options." + o.ID
				if opts[o.ID] {
					add("DUPLICATE_OPTION_ID", "Option IDs must be unique within a switch.", n, o.ID, f)
				}
				opts[o.ID] = true
				if strings.TrimSpace(o.Label) == "" {
					add("EMPTY_OPTION_LABEL", "Give this option a label.", n, o.ID, f+".label")
				}
				if o.Target == nil {
					add("MISSING_OPTION_TARGET", "Connect the "+o.Label+" option to a node.", n, o.ID, f+".target")
				} else if dest, ok := m[*o.Target]; !ok {
					add("UNKNOWN_TARGET", "This option points to a missing node.", n, o.ID, f+".target")
				} else if dest.Type == "switch" {
					add("CONSECUTIVE_SWITCHES", "Connect the switch to a talking point first.", n, o.ID, f+".target")
				}
			}
		}
		if n.Type != "switch" && n.Next != nil {
			if _, ok := m[*n.Next]; !ok {
				add("UNKNOWN_TARGET", "This connection points to a missing node.", n, "", "next")
			}
		}
	}
	color := map[string]int{}
	cycle := map[string]bool{}
	var visit func(string)
	visit = func(id string) {
		if color[id] == 1 {
			cycle[id] = true
			return
		}
		if color[id] == 2 {
			return
		}
		n, ok := m[id]
		if !ok {
			return
		}
		color[id] = 1
		for _, t := range targets(n) {
			visit(t)
		}
		color[id] = 2
	}
	for _, n := range d.Nodes {
		visit(n.ID)
	}
	for _, n := range d.Nodes {
		if cycle[n.ID] {
			add("CYCLE", "Remove this cycle; conversations must move forward.", n, "", "")
		}
	}
	if len(starts) == 1 {
		seen := map[string]bool{}
		var walk func(string)
		walk = func(id string) {
			if seen[id] {
				return
			}
			seen[id] = true
			for _, t := range targets(m[id]) {
				walk(t)
			}
		}
		walk(starts[0].ID)
		for _, n := range d.Nodes {
			if !seen[n.ID] {
				add("UNREACHABLE_NODE", "Connect this node to the conversation start.", n, "", "")
			}
		}
	}
	return out
}
func BuildGroup(d Definition, first string, choices map[string]string) Group {
	g := Group{First: first}
	n := d.Index()[first]
	if n.Type == "switch" {
		for _, o := range n.Options {
			if choices[first] == o.ID && o.Target != nil {
				g.Second = *o.Target
				break
			}
		}
	} else if n.Next != nil {
		g.Second = *n.Next
	}
	return g
}
func Initial(d Definition, start string) Progress {
	if start == "" {
		for _, n := range d.Nodes {
			if n.IsStart {
				start = n.ID
				break
			}
		}
	}
	p := Progress{Groups: []Group{BuildGroup(d, start, map[string]string{})}, Choices: map[string]string{}, Retained: []string{}}
	p.Rebuild()
	return p
}
func (p *Progress) Rebuild() {
	p.Retained = []string{}
	for _, g := range p.Groups {
		p.Retained = append(p.Retained, g.First)
		if g.Second != "" {
			p.Retained = append(p.Retained, g.Second)
		}
	}
}
func NextID(d Definition, p Progress) string {
	if p.Active < 0 || p.Active >= len(p.Groups) {
		return ""
	}
	g := p.Groups[p.Active]
	id := g.Second
	if id == "" {
		id = g.First
	}
	n := d.Index()[id]
	if n.Type == "switch" || n.Next == nil {
		return ""
	}
	return *n.Next
}
func ValidateProgress(d Definition, p Progress) error {
	bad := errors.New("Progress does not match the frozen script.")
	if len(p.Groups) == 0 || len(p.Groups) > len(d.Nodes) || p.Active < 0 || p.Active >= len(p.Groups) || p.Choices == nil {
		return bad
	}
	start := ""
	for _, n := range d.Nodes {
		if n.IsStart {
			start = n.ID
		}
	}
	next := start
	seen := map[string]bool{}
	used := map[string]bool{}
	path := []string{}
	m := d.Index()
	for _, g := range p.Groups {
		if next == "" || g.First != next {
			return bad
		}
		expected := BuildGroup(d, next, p.Choices)
		if expected != g {
			return bad
		}
		for _, id := range []string{g.First, g.Second} {
			if id == "" {
				continue
			}
			n, ok := m[id]
			if !ok || seen[id] {
				return bad
			}
			seen[id] = true
			path = append(path, id)
			if choice, ok := p.Choices[id]; ok {
				if n.Type != "switch" {
					return bad
				}
				valid := false
				for _, o := range n.Options {
					if o.ID == choice {
						valid = true
					}
				}
				if !valid {
					return bad
				}
				used[id] = true
			}
		}
		last := g.Second
		if last == "" {
			last = g.First
		}
		n := m[last]
		next = ""
		if n.Type == "switch" {
			for _, o := range n.Options {
				if p.Choices[last] == o.ID && o.Target != nil {
					next = *o.Target
				}
			}
		} else if n.Next != nil {
			next = *n.Next
		}
	}
	if len(used) != len(p.Choices) || !reflect.DeepEqual(path, p.Retained) {
		return bad
	}
	return nil
}
