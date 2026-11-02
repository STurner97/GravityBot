import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPageSizeFitsRows } from './discordLimits.js';

test('page sizes 1 to 20 fit in the 5 action rows', () => {
  for (const size of [1, 5, 20]) {
    assert.doesNotThrow(() => assertPageSizeFitsRows(size), `size ${size}`);
  }
});

test('page size 0 is rejected', () => {
  assert.throws(() => assertPageSizeFitsRows(0), /PREDICTIONS_PAGE_SIZE/);
});

test('page size 21 needs more than 5 rows and is rejected', () => {
  assert.throws(() => assertPageSizeFitsRows(21), /PREDICTIONS_PAGE_SIZE/);
});

test('a non-integer page size is rejected', () => {
  for (const bad of [2.5, NaN, '5', undefined, -1]) {
    assert.throws(() => assertPageSizeFitsRows(bad), /PREDICTIONS_PAGE_SIZE/, String(bad));
  }
});
