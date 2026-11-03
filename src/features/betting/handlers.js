import {
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import {
  getUserBalance,
  getAllBalances,
  getPrediction,
  getUserBets,
  changeBalance,
  voidPrediction,
} from '../../../betting.js';
import { ephemeral, public_ } from '../../lib/response.js';
import { messageText } from '../../lib/messages/index.js';
import { isAdmin } from '../../lib/auth.js';
import { encode } from '../../lib/customId.js';
import { buildPredictModal, buildBetModal, buildResolveModal } from './modals.js';
import { loadPredictionsPage } from './loadPredictionsPage.js';

export async function handleBalance(interaction) {
  const { data, userId } = interaction;
  const userOption = data.options?.find(opt => opt.name === 'user')?.value;

  if (userOption) {
    const userIdMatch = userOption.match(/^<@!?(\d+)>$/);
    if (!userIdMatch) {
      return ephemeral(messageText('balance.invalidUser'));
    }
    const targetUserId = userIdMatch[1];
    const balance = await getUserBalance(targetUserId);
    return public_(messageText('balance.other', { userId: targetUserId, balance }));
  }

  const balance = await getUserBalance(userId);
  return ephemeral(messageText('balance.own', { balance }));
}

export async function handleBalances(interaction) {
  const balances = await getAllBalances();

  const items = balances.map(row => ({ userId: row.user_id, balance: row.balance }));
  return ephemeral(messageText('balances', { items }));
}

export function handlePredict() {
  return buildPredictModal();
}

export async function handleBet(interaction) {
  const { data } = interaction;
  const predictionId = data.options.find(opt => opt.name === 'prediction_id').value;
  const prediction = await getPrediction(predictionId);

  if (!prediction) {
    return ephemeral(messageText('bet.notFoundWithHint', { predictionId }));
  }

  if (prediction.resolved) {
    return ephemeral(`❌ Prediction #${predictionId} is already resolved.`);
  }

  return buildBetModal(predictionId, prediction.options);
}

export async function handlePredictions(interaction) {
  const { content, components } = await loadPredictionsPage(interaction.userId, 0, 'listPredictions');
  return ephemeral(content, components);
}

export async function handleMyBets(interaction) {
  const { userId } = interaction;
  const userBets = await getUserBets(userId);

  if (userBets.length === 0) {
    return ephemeral(messageText('myBets', { items: [] }));
  }

  const items = userBets.map(betInfo => ({
    predictionId: betInfo.predictionId,
    question: betInfo.question,
    option: betInfo.bet.prediction,
    amount: betInfo.bet.amount,
  }));
  return ephemeral(messageText('myBets', { items }));
}

export async function handleResolve(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral(messageText('denied.admin'));
  }

  const predictionId = data.options.find(opt => opt.name === 'prediction_id').value;
  const prediction = await getPrediction(predictionId);

  if (!prediction) {
    return ephemeral(messageText('prediction.notFound', { predictionId }));
  }

  return buildResolveModal(predictionId, prediction.options);
}

export async function handleVoidPrediction(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral(messageText('denied.admin'));
  }

  const predictionId = data.options.find(opt => opt.name === 'prediction_id').value;
  const prediction = await getPrediction(predictionId);

  if (!prediction) {
    return ephemeral(messageText('prediction.notFound', { predictionId }));
  }

  const result = await voidPrediction(predictionId);
  if (!result.success) {
    return ephemeral(`❌ ${result.error}`);
  }

  let message =
    `✅ **Prediction #${predictionId} Voided!**\n\n` +
    `**Question:** ${prediction.question}\n` +
    `**Total Pot Returned:** ${result.totalPot} credits\n\n`;

  if (result.refunds.length === 0) {
    message += '💸 No bets to refund.';
  } else {
    message += '💸 **Refunds:**\n';
    for (const refund of result.refunds) {
      message += `<@${refund.userId}> received **${refund.amount}** credits back\n`;
    }
  }

  return public_(message);
}

const BEG_BALANCE_LIMIT = 10;
const DONATE_AMOUNTS = [1, 50, 100];

function buildDonateButtons(targetUserId) {
  return [{
    type: MessageComponentTypes.ACTION_ROW,
    components: DONATE_AMOUNTS.map(amount => ({
      type: MessageComponentTypes.BUTTON,
      style: ButtonStyleTypes.PRIMARY,
      label: messageText('donate.button', { amount }),
      custom_id: encode('donate', targetUserId, amount),
    })),
  }];
}

export async function handleBeg(interaction) {
  const { userId, member, user } = interaction;
  const balance = await getUserBalance(userId);

  if (balance > BEG_BALANCE_LIMIT) {
    return ephemeral(messageText('beg.tooRich'));
  }

  const username = member?.nick ?? member?.user?.username ?? user?.username ?? `<@${userId}>`;
  console.log(`[Betting] userId=${userId} balance=${balance} action=beg`);
  return public_(messageText('beg.request', { username }), buildDonateButtons(userId));
}

export async function handleChangeBalance(interaction) {
  const { data, userId } = interaction;

  if (!isAdmin(userId)) {
    return ephemeral(messageText('denied.admin'));
  }

  const targetUser = data.options.find(opt => opt.name === 'user').value;
  const action     = data.options.find(opt => opt.name === 'action').value;
  const amount     = data.options.find(opt => opt.name === 'amount').value;

  let changeAmount;
  if (action === 'set') {
    const currentBalance = await getUserBalance(targetUser);
    changeAmount = amount - currentBalance;
  } else {
    changeAmount = action === 'add' ? amount : -amount;
  }

  const result = await changeBalance(targetUser, changeAmount);
  if (!result.success) {
    return ephemeral(`❌ ${result.error}`);
  }

  return public_(messageText(`changeBalance.${action}`, {
    amount,
    userId: targetUser,
    oldBalance: result.oldBalance,
    newBalance: result.newBalance,
  }));
}
