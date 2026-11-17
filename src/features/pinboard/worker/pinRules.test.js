import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideReactionOutcome, decideDeletionOutcome } from './pinRules.js';

const THRESHOLD = 3;
const rowOf = (pinState) => ({ message_id: '10', pinboard_message_id: '20', pin_state: pinState });
const decide = (pinState, reactionCount) =>
  decideReactionOutcome({ row: pinState ? rowOf(pinState) : null, reactionCount, threshold: THRESHOLD });

test('a banned row never posts, updates or removes, at any count', () => {
  for (const count of [0, 1, 2, 3, 9]) {
    assert.deepEqual(decide('banned', count), { action: 'none' });
  }
});

test('a natural or forced row at zero is removed', () => {
  assert.deepEqual(decide('natural', 0), { action: 'remove' });
  assert.deepEqual(decide('forced', 0), { action: 'remove' });
});

test('no row below the threshold does nothing', () => {
  assert.deepEqual(decide(null, 0), { action: 'none' });
  assert.deepEqual(decide(null, 2), { action: 'none' });
});

test('no row at or above the threshold posts a natural pin', () => {
  assert.deepEqual(decide(null, 3), { action: 'publish', pinState: 'natural' });
  assert.deepEqual(decide(null, 7), { action: 'publish', pinState: 'natural' });
});

test('a forced row below the threshold updates and stays forced', () => {
  assert.deepEqual(decide('forced', 1), { action: 'publish', pinState: 'forced' });
  assert.deepEqual(decide('forced', 2), { action: 'publish', pinState: 'forced' });
});

test('a forced or natural row at or above the threshold becomes natural (M5)', () => {
  assert.deepEqual(decide('forced', 3), { action: 'publish', pinState: 'natural' });
  assert.deepEqual(decide('natural', 3), { action: 'publish', pinState: 'natural' });
  assert.deepEqual(decide('forced', 8), { action: 'publish', pinState: 'natural' });
});

test('a natural row below the threshold updates and stays natural', () => {
  assert.deepEqual(decide('natural', 1), { action: 'publish', pinState: 'natural' });
  assert.deepEqual(decide('natural', 2), { action: 'publish', pinState: 'natural' });
});

test('the source message deleted removes the pin, whatever the state', () => {
  for (const state of ['natural', 'forced', 'banned']) {
    assert.equal(decideDeletionOutcome('10', rowOf(state)), 'removePin');
  }
});

test('the pin post of a forced row deleted is forgotten (M4)', () => {
  assert.equal(decideDeletionOutcome('20', rowOf('forced')), 'forget');
});

test('the pin post of a natural row deleted is banned (M3)', () => {
  assert.equal(decideDeletionOutcome('20', rowOf('natural')), 'ban');
});

test('the pin post of a banned row deleted does nothing', () => {
  assert.equal(decideDeletionOutcome('20', rowOf('banned')), 'nothing');
});

test('an id that matches neither column does nothing', () => {
  assert.equal(decideDeletionOutcome('99', rowOf('natural')), 'nothing');
});
