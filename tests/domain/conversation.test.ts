import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  initial,
  advance,
  choose,
  back,
  type Definition,
  type Progress,
} from "../../src/lib/domain";
type Step = {
  action: "initial" | "next" | "choose" | "back";
  nodeId?: string;
  optionId?: string;
  expected: Progress;
};
const fixtures = JSON.parse(
  readFileSync("backend/contract/conversation-fixtures.json", "utf8"),
) as { name: string; definition: Definition; steps: Step[] }[];
for (const fixture of fixtures)
  test(fixture.name, () => {
    let p: Progress = initial(fixture.definition);
    for (const s of fixture.steps) {
      if (s.action === "next") p = advance(fixture.definition, p);
      if (s.action === "back") p = back(p);
      if (s.action === "choose")
        p = choose(fixture.definition, p, s.nodeId!, s.optionId!);
      assert.deepEqual(p, s.expected);
    }
  });

test("legacy Question drafts become Talking points without losing content or links", async () => {
  const { normalizeDefinition } = await import("../../src/lib/domain");
  const raw = JSON.parse(
    '{"schemaVersion":1,"nodes":[{"id":"a","type":"question","isStart":true,"text":"Why?","next":"b"},{"id":"b","type":"talking_point","isStart":false,"text":"Thanks","next":null}],"layout":{"positions":{"a":{"x":12,"y":24}}}}',
  );
  const normalized = normalizeDefinition(raw);
  assert.equal(normalized.nodes[0].type, "talking_point");
  assert.equal(normalized.nodes[0].id, "a");
  assert.deepEqual(initial(normalized), initial(raw));
  assert.deepEqual(normalized.layout, raw.layout);
  assert.equal(raw.nodes[0].type, "question");
});
