import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const consent = readFileSync(new URL('./lib/consent.client.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../site/styles.css', import.meta.url), 'utf8');

function rootTokens() {
  const root = css.match(/^:root\s*\{([\s\S]*?)^\}/m);
  assert.ok(root, 'site/styles.css must contain a :root block');

  return new Map(
    [...root[1].matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)]
      .map(([, name, value]) => [name, value.trim().toLowerCase()]),
  );
}

function resolveToken(tokens, name, seen = new Set()) {
  assert.ok(!seen.has(name), `cyclic CSS variable reference for ${name}`);
  seen.add(name);

  const value = tokens.get(name);
  assert.ok(value, `site/styles.css :root must define ${name}`);

  const alias = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  return alias ? resolveToken(tokens, alias[1], seen) : value;
}

test('consent banner fallback colors match the current dark palette', () => {
  const tokens = rootTokens();
  const fallbacks = [...consent.matchAll(/var\(\s*(--[\w-]+)\s*,\s*(#[0-9a-fA-F]{6})\s*\)/g)];

  assert.equal(fallbacks.length, 15, 'all 15 consent fallback colors should be covered');

  for (const [, name, fallback] of fallbacks) {
    const expected = resolveToken(tokens, name);
    assert.equal(
      fallback.toLowerCase(),
      expected,
      `${name}: consent fallback ${fallback} does not match styles.css :root value ${expected}`,
    );
  }
});
