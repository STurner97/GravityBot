import { registerCommand } from '../../interactions/registry.js';
import { handlePinboard } from './handlers.js';

registerCommand('pinboard', handlePinboard);
