import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';
import { BETTING_COMMANDS } from './src/features/betting/commands.js';
import { DEBUG_COMMANDS } from './src/features/debug/commands.js';
import { PINBOARD_COMMANDS } from './src/features/pinboard/commands.js';

const ALL_COMMANDS = [...BETTING_COMMANDS, ...DEBUG_COMMANDS, ...PINBOARD_COMMANDS];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
