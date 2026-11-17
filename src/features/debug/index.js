import { resetDatabase } from '../../../betting.js';
import { registerCommand, registerModal, registerButton } from '../../interactions/registry.js';
import { handleDebug } from './handlers.js';
import { handleDebugSqlModal } from './modals.js';
import { isAdmin } from '../../lib/auth.js';
import { handleConfirmReset } from './buttons.js';

registerCommand('debug',          handleDebug);
registerModal('debug_sql_modal',  handleDebugSqlModal);
registerButton('confirm_reset',   (interaction) => handleConfirmReset(interaction, { isAdmin, reset: resetDatabase }));
