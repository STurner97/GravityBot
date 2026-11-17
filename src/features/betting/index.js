import { registerCommand, registerModal, registerButton } from '../../interactions/registry.js';
import {
  handleBalance,
  handleBalances,
  handlePredict,
  handleBet,
  handlePredictions,
  handleMyBets,
  handleResolve,
  handleVoidPrediction,
  handleChangeBalance,
  handleBeg,
} from './handlers.js';
import {
  handlePredictModal,
  handleBetModal,
} from './modals.js';
import { handleResolveModal } from './resolveModal.js';
import { isAdmin } from '../../lib/auth.js';
import { getPrediction, resolvePrediction } from '../../../betting.js';
import { handleBetButton, handleDonateButton, handlePredictionsPageButton } from './buttons.js';
import { PREDICTIONS_PAGE_NAMESPACE } from './predictionsList.js';

registerCommand('balance',        handleBalance);
registerCommand('balances',       handleBalances);
registerCommand('predict',        handlePredict);
registerCommand('bet',            handleBet);
registerCommand('predictions',    handlePredictions);
registerCommand('mybets',         handleMyBets);
registerCommand('resolve',        handleResolve);
registerCommand('voidprediction', handleVoidPrediction);
registerCommand('changebalance',  handleChangeBalance);
registerCommand('beg',            handleBeg);

registerModal('predict_modal', handlePredictModal);
registerModal('bet_modal',     handleBetModal);
registerModal('resolve_modal', (interaction) =>
  handleResolveModal(interaction, { isAdmin, getPrediction, resolvePrediction }));

registerButton('bet',    handleBetButton);
registerButton('donate', handleDonateButton);
registerButton(PREDICTIONS_PAGE_NAMESPACE, handlePredictionsPageButton);
