import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPredictionsListPage } from './predictionsList.js';
import { NO_PREDICTIONS_TEXT } from './predictionsListFormat.js';
import { MAX_ACTION_ROWS, BUTTONS_PER_ROW } from '../../lib/discordLimits.js';

const PAGE_SIZE = 5;

// Newest first, like getActivePredictions(): ids count down from `count`.
function makePredictions(count) {
  return Array.from({ length: count }, (_, i) => {
    const id = count - i;
    return {
      id,
      question: `Question ${id}?`,
      options: ['Yes', 'No'],
      bets: [],
      createdAt: new Date(Date.UTC(2026, 0, 1) + id * 86400000),
    };
  });
}

const buttonsOf = (row) => row.components;
const customIds = (components) => components.flatMap(buttonsOf).map(b => b.custom_id);
const betIds = (components) => customIds(components).filter(id => id.startsWith('bet:'));
const pagingIds = (components) => customIds(components).filter(id => id.startsWith('predictions_page:'));

test('page 0 of 12 holds the newest 5 predictions', () => {
  const { content, components } = buildPredictionsListPage(makePredictions(12), 0, PAGE_SIZE);
  assert.deepEqual(betIds(components), ['bet:12', 'bet:11', 'bet:10', 'bet:9', 'bet:8']);
  assert.match(content, /\*\*ID 12:\*\*/);
  assert.match(content, /\*\*ID 8:\*\*/);
  assert.doesNotMatch(content, /\*\*ID 7:\*\*/);
});

test('the last page holds the remainder', () => {
  const { content, components } = buildPredictionsListPage(makePredictions(12), 2, PAGE_SIZE);
  assert.deepEqual(betIds(components), ['bet:2', 'bet:1']);
  assert.match(content, /\*\*ID 1:\*\*/);
});

test('every active prediction is reachable across the pages', () => {
  const predictions = makePredictions(12);
  const reached = [0, 1, 2].flatMap(page =>
    betIds(buildPredictionsListPage(predictions, page, PAGE_SIZE).components));
  assert.deepEqual(reached.sort(), predictions.map(p => `bet:${p.id}`).sort());
});

test('first page has Next only, middle has both, last has Previous only', () => {
  const predictions = makePredictions(12);
  const pagingOn = (page) =>
    pagingIds(buildPredictionsListPage(predictions, page, PAGE_SIZE).components);
  assert.deepEqual(pagingOn(0), ['predictions_page:1']);
  assert.deepEqual(pagingOn(1), ['predictions_page:0', 'predictions_page:2']);
  assert.deepEqual(pagingOn(2), ['predictions_page:1']);
});

test('reports the page it built, after clamping', () => {
  const built = buildPredictionsListPage(makePredictions(12), 99, PAGE_SIZE);
  assert.equal(built.pageIndex, 2);
  assert.equal(built.pageCount, 3);
});

test('the page line is one-based', () => {
  const { content } = buildPredictionsListPage(makePredictions(12), 1, PAGE_SIZE);
  assert.match(content, /Page 2 of 3/);
});

test('a page past the end shows the last page', () => {
  const { components } = buildPredictionsListPage(makePredictions(12), 99, PAGE_SIZE);
  assert.deepEqual(betIds(components), ['bet:2', 'bet:1']);
});

test('a negative or non-numeric page shows page 0', () => {
  for (const bad of [-3, NaN, 'abc', 1.5, undefined, null]) {
    const { components } = buildPredictionsListPage(makePredictions(12), bad, PAGE_SIZE);
    assert.deepEqual(betIds(components)[0], 'bet:12', `requested ${String(bad)}`);
  }
});

test('5 or fewer predictions give one page with no paging buttons or page line', () => {
  for (const count of [1, 5]) {
    const { content, components } = buildPredictionsListPage(makePredictions(count), 0, PAGE_SIZE);
    assert.equal(components.length, 1);
    assert.deepEqual(pagingIds(components), []);
    assert.doesNotMatch(content, /Page \d/);
  }
});

test('6 predictions need a second page', () => {
  const { components } = buildPredictionsListPage(makePredictions(6), 0, PAGE_SIZE);
  assert.deepEqual(pagingIds(components), ['predictions_page:1']);
});

test('an empty list gives the empty text and no components', () => {
  const page = buildPredictionsListPage([], 0, PAGE_SIZE);
  assert.equal(page.content, NO_PREDICTIONS_TEXT);
  assert.deepEqual(page.components, []);
});

test('bet buttons and paging buttons sit in separate rows', () => {
  const { components } = buildPredictionsListPage(makePredictions(12), 1, PAGE_SIZE);
  assert.equal(components.length, 2);
  assert.ok(betIds([components[0]]).length === 5 && pagingIds([components[0]]).length === 0);
  assert.ok(pagingIds([components[1]]).length === 2 && betIds([components[1]]).length === 0);
});

test('every page respects Discord row and button limits and has unique custom_ids', () => {
  const cases = [[23, 5], [100, 20], [7, 2], [50, 1]];
  for (const [count, pageSize] of cases) {
    const predictions = makePredictions(count);
    const pages = Math.ceil(count / pageSize);
    for (let page = 0; page < pages; page++) {
      const { components } = buildPredictionsListPage(predictions, page, pageSize);
      const label = `${count} predictions, size ${pageSize}, page ${page}`;
      assert.ok(components.length <= MAX_ACTION_ROWS, label);
      for (const row of components) {
        assert.ok(buttonsOf(row).length <= BUTTONS_PER_ROW, label);
      }
      const ids = customIds(components);
      assert.equal(new Set(ids).size, ids.length, label);
    }
  }
});
