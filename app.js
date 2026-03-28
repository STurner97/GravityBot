import 'dotenv/config';
import express from 'express';
import { verifyKeyMiddleware } from 'discord-interactions';
import { handleInteraction } from './src/interactions/router.js';

// Feature registration — importing these files runs registerCommand/Modal/Button side effects.
import './src/features/betting/index.js';
import './src/features/debug/index.js';
import './src/features/pinboard/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), handleInteraction);

app.listen(PORT, () => console.log(`[App] Listening on port ${PORT}`));
