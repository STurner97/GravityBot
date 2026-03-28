import { ADMIN_IDS } from '../config.js';

export const isAdmin = (userId) => ADMIN_IDS.includes(userId);
