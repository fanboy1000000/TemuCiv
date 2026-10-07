// Tests for the model-routing guard: the reviewer runs only on Fable, generic spawns must name a model.

import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { runHook } from './helpers.mjs';

const HOOK = 'model-routing-guard.mjs';
const spawn = (tool_input) => runHook(HOOK, { tool_name: 'Agent', tool_input: { prompt: 'x', ...tool_input } }, { cwd: tmpdir() });

test('the reviewer must name Fable explicitly; relying on the definition default is blocked', () => {
  const run = spawn({ subagent_type: 'reviewer' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /must name it/);
});

test('the reviewer explicitly on Fable is allowed, by alias or full model id', () => {
  assert.equal(spawn({ subagent_type: 'reviewer', model: 'fable' }).status, 0);
  assert.equal(spawn({ subagent_type: 'reviewer', model: 'claude-fable-5-1' }).status, 0);
});

test('the reviewer on a cheaper model is blocked', () => {
  for (const model of ['opus', 'sonnet', 'haiku']) {
    const run = spawn({ subagent_type: 'reviewer', model });
    assert.equal(run.status, 2, model);
    assert.match(run.stderr, /only on Fable/);
  }
});

test('a generic spawn without a model is blocked', () => {
  for (const subagent_type of ['general-purpose', 'claude', undefined]) {
    const run = spawn({ subagent_type });
    assert.equal(run.status, 2, String(subagent_type));
    assert.match(run.stderr, /must name its model/);
  }
});

test('a generic spawn that names a model is allowed', () => {
  assert.equal(spawn({ subagent_type: 'general-purpose', model: 'sonnet' }).status, 0);
});

test('named roles and read-only built-ins are allowed', () => {
  for (const subagent_type of ['simulation', 'test-qa', 'Explore', 'Plan', 'fork']) {
    assert.equal(spawn({ subagent_type }).status, 0, subagent_type);
  }
});

test('other tools and unparseable input are allowed', () => {
  assert.equal(runHook(HOOK, { tool_name: 'Bash', tool_input: { command: 'ls' } }, { cwd: tmpdir() }).status, 0);
  assert.equal(runHook(HOOK, '{broken', { cwd: tmpdir() }).status, 0);
});
