import assert from 'node:assert/strict';
import test from 'node:test';

import { DEMO_MESSAGES } from '../../src/data/demo-dataset.js';

test('demo dataset has unique stable identifiers', () => {
  const ids = DEMO_MESSAGES.map((message) => message.demoId);

  assert.equal(DEMO_MESSAGES.length, 8);
  assert.equal(new Set(ids).size, ids.length);
});

test('demo dataset uses only fictitious email domains', () => {
  for (const message of DEMO_MESSAGES) {
    assert.match(message.from, /@[^@]+\.test$/);
    assert.match(message.to, /@[^@]+\.test$/);
    assert.match(message.replyTo, /@[^@]+\.test$/);
  }
});

test('scan scores and buckets are internally consistent', () => {
  const scanned = DEMO_MESSAGES.filter((message) => message.scan);
  const unscanned = DEMO_MESSAGES.filter((message) => !message.scan);

  assert.equal(scanned.length, 7);
  assert.equal(unscanned.length, 1);
  assert.equal(unscanned[0].riskBucket, 'unscanned');

  for (const message of scanned) {
    assert.equal(message.scan.verdict, message.effectiveVerdict);
    assert.ok(message.scan.score >= 0 && message.scan.score <= 100);
  }
});
