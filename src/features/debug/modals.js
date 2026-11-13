import { query } from '../../../db.js';
import { ephemeral } from '../../lib/response.js';
import { isAdmin } from '../../lib/auth.js';
import { messageText } from '../../lib/messages/index.js';
import { formatSqlResult, formatSqlError } from './formatSqlResult.js';

export async function handleDebugSqlModal(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral(messageText('debug.sql.denied'));
  }

  // Intentional admin escape hatch: executes raw SQL from modal input.
  const sqlQuery = data.components[0].components[0].value;

  try {
    const result = await query(sqlQuery);
    return ephemeral(formatSqlResult(result));
  } catch (err) {
    return ephemeral(formatSqlError(err.message));
  }
}
