import { query } from '../../../db.js';
import { ephemeral } from '../../lib/response.js';
import { isAdmin } from '../../lib/auth.js';

export async function handleDebugSqlModal(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral('❌ You do not have permission to execute SQL queries.');
  }

  // Intentional admin escape hatch: executes raw SQL from modal input.
  const sqlQuery = data.components[0].components[0].value;

  try {
    const result = await query(sqlQuery);

    if (!result.rows || result.rows.length === 0) {
      return ephemeral(`✅ Query executed.\n\`\`\`\nRows affected: ${result.rowCount}\n\`\`\``);
    }

    const rows = result.rows;
    const keys = Object.keys(rows[0]);
    const widths = keys.map(key => {
      const maxDataLen = Math.max(...rows.map(row => String(row[key] ?? 'NULL').length));
      return Math.min(Math.max(key.length, maxDataLen), 20);
    });

    let table = '```\n';
    table += keys.map((key, i) => key.padEnd(widths[i])).join(' | ') + '\n';
    table += keys.map((_, i) => '-'.repeat(widths[i])).join('-+-') + '\n';
    for (const row of rows.slice(0, 15)) {
      table += keys.map((key, i) => String(row[key] ?? 'NULL').substring(0, widths[i]).padEnd(widths[i])).join(' | ') + '\n';
    }
    if (rows.length > 15) {
      table += `... and ${rows.length - 15} more rows\n`;
    }
    table += '```';

    return ephemeral(`✅ Query executed. (${result.rowCount} rows)\n\n${table}`);
  } catch (err) {
    return ephemeral(`❌ SQL Error:\n\`\`\`\n${err.message}\n\`\`\``);
  }
}
