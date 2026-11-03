import { readFileSync } from 'node:fs';
import { catalog } from '../catalog.js';
import { createMessages } from '../createMessages.js';

// The frozen wording of cb1f8a5. Tests use it instead of messages.json so rewording the
// real file never breaks them.
const REFERENCE = new URL('./wording-cb1f8a5.json', import.meta.url);
const reference = createMessages(readFileSync(REFERENCE, 'utf8'), catalog);

export const referenceText = reference.text;
export const referenceProblems = reference.problems;
