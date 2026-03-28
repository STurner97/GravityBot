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
} from './handlers.js';
import {
  handlePredictModal,
  handleBetModal,
  handleResolveModal,
} from './modals.js';
import { handleBetButton } from './buttons.js';

registerCommand('balance',        handleBalance);
registerCommand('balances',       handleBalances);
registerCommand('predict',        handlePredict);
registerCommand('bet',            handleBet);
registerCommand('predictions',    handlePredictions);
registerCommand('mybets',         handleMyBets);
registerCommand('resolve',        handleResolve);
registerCommand('voidprediction', handleVoidPrediction);
registerCommand('changebalance',  handleChangeBalance);

registerModal('predict_modal', handlePredictModal);
registerModal('bet_modal',     handleBetModal);
registerModal('resolve_modal', handleResolveModal);

registerButton('bet', handleBetButton);
