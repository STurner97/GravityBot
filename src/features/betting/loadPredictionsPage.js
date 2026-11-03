// Adapter shared by the slash command and the paging buttons: fetch, build, log.
import { getActivePredictions } from '../../../betting.js';
import { messageText } from '../../lib/messages/index.js';
import { PREDICTIONS_PAGE_SIZE } from '../../config.js';
import { buildPredictionsListPage } from './predictionsList.js';

export async function loadPredictionsPage(userId, requestedPage, action) {
  const activePredictions = await getActivePredictions();
  const page = buildPredictionsListPage(activePredictions, requestedPage, PREDICTIONS_PAGE_SIZE, messageText);
  console.log(
    `[Betting] userId=${userId} action=${action} page=${page.pageIndex + 1} ` +
    `pages=${page.pageCount} active=${activePredictions.length}`
  );
  return page;
}
