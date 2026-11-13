// The /debug sql reply. The words come from the file; the table layout is formatting of the
// database's data, so it stays here.
import { messageText } from '../../lib/messages/index.js';

const MAX_ROWS_SHOWN = 15;
const MAX_COLUMN_WIDTH = 20;
const NULL_CELL = 'NULL';

const cell = (value) => String(value ?? NULL_CELL);

function columnWidths(keys, rows) {
  return keys.map(key => {
    const widestCell = Math.max(...rows.map(row => cell(row[key]).length));
    return Math.min(Math.max(key.length, widestCell), MAX_COLUMN_WIDTH);
  });
}

function buildTable(rows, text) {
  const keys = Object.keys(rows[0]);
  const widths = columnWidths(keys, rows);

  let table = '```\n';
  table += keys.map((key, i) => key.padEnd(widths[i])).join(' | ') + '\n';
  table += keys.map((_, i) => '-'.repeat(widths[i])).join('-+-') + '\n';
  for (const row of rows.slice(0, MAX_ROWS_SHOWN)) {
    table += keys.map((key, i) => cell(row[key]).substring(0, widths[i]).padEnd(widths[i])).join(' | ') + '\n';
  }
  if (rows.length > MAX_ROWS_SHOWN) {
    table += text('debug.sql.moreRows', { count: rows.length - MAX_ROWS_SHOWN });
  }
  return table + '```';
}

export function formatSqlResult(result, text = messageText) {
  if (!result.rows || result.rows.length === 0) {
    return text('debug.sql.noRows', { rowCount: result.rowCount });
  }
  return text('debug.sql.rows', { rowCount: result.rowCount, table: buildTable(result.rows, text) });
}

// Raw on purpose: an admin typing SQL needs to see why it failed.
export function formatSqlError(errorMessage, text = messageText) {
  return text('debug.sql.error', { error: errorMessage });
}
