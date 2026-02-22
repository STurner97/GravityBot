import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
  ButtonStyleTypes,
  TextStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import {
  getUserBalance,
  createPrediction,
  placeBet,
  resolvePrediction,
  voidPrediction,
  getAllBalances,
  getActivePredictions,
  getPrediction,
  getUserBets,
  changeBalance,
  getDebugStats,
  getUserDebug,
  getRecentPredictions,
  resetDatabase,
} from './betting.js';
import {
  getPinboardConfig,
  setPinboardChannel,
  listPinboardWhitelist,
  addPinboardWhitelist,
  removePinboardWhitelist,
} from './pinboard.js';
import { query } from './db.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Admin user IDs (add your Discord user ID here)
const ADMIN_IDS = [
  // Add admin Discord user IDs here, e.g., '123456789012345678'
  '218448193661173761'
];

// Allowed channel IDs (leave empty to allow all channels)
// To get a channel ID: Enable Developer Mode in Discord settings,
// right-click the channel, and click "Copy Channel ID"
const ALLOWED_CHANNEL_IDS = [
  // Add channel IDs here, e.g., '123456789012345678'
  // Leave empty array [] to allow all channels
  '419913061097406464',
  '1469016835801219278'
];

function buildOptionsPlaceholder(options, maxLength = 100) {
  if (!Array.isArray(options) || options.length === 0) {
    return 'Enter an option';
  }

  const text = options.join(', ');
  if (text.length <= maxLength) {
    return text;
  }

  if (maxLength <= 3) {
    return text.slice(0, maxLength);
  }

  return `${text.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatTimestamp(dateStr, format = 'F') {
  if (!dateStr) return 'unknown';
  const unixSeconds = Math.floor(new Date(dateStr).getTime() / 1000);
  return `<t:${unixSeconds}:${format}>`;
}

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction id, type and data
  const { id, type, data, member, user } = req.body;

  // Get user ID (works in both guilds and DMs)
  const userId = member?.user?.id || user?.id;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Channel restriction check (if enabled)
  if (ALLOWED_CHANNEL_IDS.length > 0) {
    const channelId = req.body.channel?.id || req.body.channel_id;
    if (channelId && !ALLOWED_CHANNEL_IDS.includes(channelId)) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ This bot can only be used in specific channels.',
          flags: 64, // Ephemeral
        },
      });
    }
  }

  /**
   * Handle slash command requests
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    // /balance command
    if (name === 'balance') {
      const userOption = options?.find(opt => opt.name === 'user')?.value;

      // Show specific user's balance
      if (userOption) {
        // Extract user ID from mention format <@123456> or <@!123456>
        const userIdMatch = userOption.match(/^<@!?(\d+)>$/);
        if (!userIdMatch) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Invalid user format. Please tag a user or use "_all".',
            },
          });
        }

        const targetUserId = userIdMatch[1];
        const balance = await getUserBalance(targetUserId);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `💰 <@${targetUserId}> has **${balance}** credits.`,
          },
        });
      }

      // Show own balance (default)
      const balance = await getUserBalance(userId);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `💰 You have **${balance}** credits.`,
          flags: 64,
        },
      });
    }

    // /balances command
    if (name === 'balances') {
      const balances = await getAllBalances();

      if (balances.length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '💰 Everyone has the default balance (1000 credits).',
            flags: 64,
          },
        });
      }

      let message = '💰 **All Balances:**\n\n';
      for (const row of balances) {
        message += `<@${row.user_id}>: **${row.balance}** credits\n`;
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
          flags: 64,
        },
      });
    }

    // /debug command - admin only
    if (name === 'debug') {
      if (!ADMIN_IDS.includes(userId)) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You do not have permission to use this command.',
            flags: 64,
          },
        });
      }

      const subcommand = options?.[0];
      if (!subcommand) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Missing debug subcommand.',
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'stats') {
        const stats = await getDebugStats();
        const message =
          '🧪 **DB Stats:**\n' +
          `Users: ${stats.users}\n` +
          `Predictions: ${stats.predictions} (active: ${stats.active_predictions}, resolved: ${stats.resolved_predictions})\n` +
          `Bets: ${stats.bets} | Total bet amount: ${stats.total_bet_amount}`;
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: message,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'prediction') {
        const predictionId = subcommand.options?.find(opt => opt.name === 'prediction_id')?.value;
        const prediction = await getPrediction(predictionId);
        if (!prediction) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ Prediction #${predictionId} not found.`,
              flags: 64,
            },
          });
        }

        const totalPot = prediction.bets.reduce((sum, bet) => sum + bet.amount, 0);
        const createdAt = formatTimestamp(prediction.createdAt);
        let message = `🧪 **Prediction #${prediction.id}**\n`;
        message += `Question: ${prediction.question}\n`;
        message += `Options: ${prediction.options.join(', ')}\n`;
        message += `Created: ${createdAt}\n`;
        message += `Resolved: ${prediction.resolved ? 'yes' : 'no'}\n`;
        message += `Outcome: ${prediction.outcome || 'n/a'}\n`;
        message += `Total pot: ${totalPot} credits\n`;
        message += `Bets (${prediction.bets.length}):\n`;

        if (prediction.bets.length === 0) {
          message += 'No bets yet.';
        } else {
          const maxBets = 10;
          for (const bet of prediction.bets.slice(0, maxBets)) {
            message += `• <@${bet.userId}>: ${bet.prediction} (${bet.amount})\n`;
          }
          if (prediction.bets.length > maxBets) {
            message += `…and ${prediction.bets.length - maxBets} more`;
          }
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: message,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'user') {
        const targetUserId = subcommand.options?.find(opt => opt.name === 'user')?.value;
        const limit = subcommand.options?.find(opt => opt.name === 'limit')?.value || 10;
        const userDebug = await getUserDebug(targetUserId, limit);

        let message = `🧪 **User <@${targetUserId}>**\n`;
        message += `Balance: ${userDebug.balance} credits\n`;
        message += `Recent bets (max ${limit}):\n`;

        if (userDebug.bets.length === 0) {
          message += 'No bets found.';
        } else {
          for (const bet of userDebug.bets) {
            const createdAt = formatTimestamp(bet.created_at);
            const status = bet.resolved ? `resolved (${bet.outcome || 'n/a'})` : 'active';
            message += `• #${bet.prediction_id}: ${bet.question} | ${bet.prediction} (${bet.amount}) | ${status} | ${createdAt}\n`;
          }
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: message,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'recent') {
        const limit = subcommand.options?.find(opt => opt.name === 'limit')?.value || 5;
        const recent = await getRecentPredictions(limit);

        let message = `🧪 **Recent Predictions (max ${limit})**\n`;
        if (recent.length === 0) {
          message += 'No predictions found.';
        } else {
          for (const pred of recent) {
            const createdAt = formatTimestamp(pred.created_at);
            const status = pred.resolved ? `resolved (${pred.outcome || 'n/a'})` : 'active';
            message += `• #${pred.id}: ${pred.question} | ${status} | ${createdAt}\n`;
          }
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: message,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'reset') {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '⚠️ **WARNING: Are you sure you want to reset the entire database?** This will delete all users, predictions, and bets.',
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.BUTTON,
                    style: ButtonStyleTypes.DANGER,
                    label: 'Yes, Reset',
                    custom_id: 'confirm_reset_yes',
                  },
                  {
                    type: MessageComponentTypes.BUTTON,
                    style: ButtonStyleTypes.SECONDARY,
                    label: 'Cancel',
                    custom_id: 'confirm_reset_no',
                  },
                ],
              },
            ],
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'sql') {
        return res.send({
          type: InteractionResponseType.MODAL,
          data: {
            custom_id: 'debug_sql_modal',
            title: 'Execute SQL Query',
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.INPUT_TEXT,
                    custom_id: 'sql_query_input',
                    label: 'SQL Query',
                    style: TextStyleTypes.PARAGRAPH,
                    placeholder: 'SELECT * FROM users;',
                    required: true,
                    max_length: 2000,
                  },
                ],
              },
            ],
          },
        });
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ Unknown debug subcommand.',
          flags: 64,
        },
      });
    }

    // /pinboard command - admin only
    if (name === 'pinboard') {
      if (!ADMIN_IDS.includes(userId)) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You do not have permission to use this command.',
            flags: 64,
          },
        });
      }

      const subcommand = options?.[0];
      if (!subcommand) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Missing pinboard subcommand.',
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'setchannel') {
        const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
        if (!channelId) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Missing channel for pinboard target.',
              flags: 64,
            },
          });
        }

        await setPinboardChannel(channelId);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `📌 Pinboard channel set to <#${channelId}>.`,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'whitelist_add') {
        const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
        if (!channelId) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Missing channel to whitelist.',
              flags: 64,
            },
          });
        }

        await addPinboardWhitelist(channelId);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `✅ Added <#${channelId}> to the pinboard whitelist.`,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'whitelist_remove') {
        const channelId = subcommand.options?.find(opt => opt.name === 'channel')?.value;
        if (!channelId) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Missing channel to remove.',
              flags: 64,
            },
          });
        }

        await removePinboardWhitelist(channelId);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `✅ Removed <#${channelId}> from the pinboard whitelist.`,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'whitelist_list') {
        const channels = await listPinboardWhitelist();
        const config = await getPinboardConfig();
        const targetText = config?.target_channel_id
          ? `<#${config.target_channel_id}>`
          : 'not set';

        if (channels.length === 0) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `📌 Pinboard channel: ${targetText}\nWhitelist is empty.`,
              flags: 64,
            },
          });
        }

        const lines = channels.map(id => `<#${id}>`).join('\n');
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `📌 Pinboard channel: ${targetText}\nWhitelisted channels:\n${lines}`,
            flags: 64,
          },
        });
      }

      if (subcommand.name === 'forcepin') {
        const messageUrl = subcommand.options?.find(opt => opt.name === 'message_url')?.value;

        if (!messageUrl) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Message URL is required.',
              flags: 64,
            },
          });
        }

        // Parse Discord message URL: https://discord.com/channels/{guild_id}/{channel_id}/{message_id}
        const urlMatch = messageUrl.match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (!urlMatch) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Invalid message URL format. Right-click a message and select "Copy Message Link".',
              flags: 64,
            },
          });
        }

        const [, guildId, channelId, messageId] = urlMatch;

        const config = await getPinboardConfig();
        if (!config?.target_channel_id) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: '❌ Pinboard target channel not set.',
              flags: 64,
            },
          });
        }

        try {
          // Fetch message from Discord API
          const { DiscordRequest } = await import('./utils.js');
          const { buildPinboardEmbed } = await import('./pinboard.js');
          const messageRes = await DiscordRequest(`channels/${channelId}/messages/${messageId}`, { method: 'GET' });
          const message = await messageRes.json();

          const sourceMessageUrl = `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;

          // Check for image attachments
          const imageAttachment = message.attachments?.find(att =>
            att.content_type?.startsWith('image/') ||
            /\.(png|jpe?g|gif|webp)$/i.test(att.filename || att.url)
          );

          // Check for GIF/image in embeds (e.g., Tenor, Giphy)
          const gifEmbed = message.embeds?.find(e =>
            e.type === 'gifv' ||
            e.type === 'image' ||
            e.image ||
            e.video ||
            e.thumbnail
          );

          const gifUrl = gifEmbed?.image?.url ||
            gifEmbed?.video?.url ||
            gifEmbed?.thumbnail?.url;

          // Build pinboard embed using shared function
          const timestamp = message.timestamp ? new Date(message.timestamp) : new Date();
          const pinboardEmbed = buildPinboardEmbed({
            count: 1,
            messageUrl: sourceMessageUrl,
            messageContent: message.content,
            authorId: message.author.id,
            createdAt: timestamp,
            imageUrl: imageAttachment?.url || gifUrl,
          });

          // Add forced pin indicator
          pinboardEmbed.author.name = '📌 1 Pin (forced)';

          const embeds = [pinboardEmbed];
          // Only include non-GIF embeds
          if (message.embeds && message.embeds.length > 0) {
            const filteredEmbeds = message.embeds.filter(e =>
              !(e.type === 'gifv' || e.type === 'image' || e.image || e.video)
            );
            if (filteredEmbeds.length > 0) {
              embeds.push(...filteredEmbeds.slice(0, 10));
            }
          }

          // Post to pinboard channel
          const postRes = await DiscordRequest(`channels/${config.target_channel_id}/messages`, {
            method: 'POST',
            body: { embeds },
          });
          const sentMessage = await postRes.json();

          // Store in DB
          const { upsertPinboardPost } = await import('./pinboard.js');
          await upsertPinboardPost({
            messageId: messageId,
            sourceChannelId: channelId,
            pinboardMessageId: sentMessage.id,
            authorId: message.author.id,
            reactionCount: 1,
          });

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Force pinned message: https://discord.com/channels/${guildId}/${config.target_channel_id}/${sentMessage.id}`,
              flags: 64,
            },
          });
        } catch (err) {
          console.error('Force pin failed', err);
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `❌ Failed to force pin: ${err.message}`,
              flags: 64,
            },
          });
        }
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '❌ Unknown pinboard subcommand.',
          flags: 64,
        },
      });
    }

    // /predict command - show modal for creating prediction
    if (name === 'predict') {
      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: 'predict_modal',
          title: 'Create a Prediction',
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'question_input',
                  label: 'Question',
                  style: TextStyleTypes.SHORT,
                  placeholder: 'e.g., How long will UK PM last?',
                  required: true,
                  max_length: 200,
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'options_input',
                  label: 'Options (comma-separated)',
                  style: TextStyleTypes.SHORT,
                  placeholder: '1 week, 2 weeks, 1 month, 3 months',
                  required: true,
                  max_length: 300,
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'choice_input',
                  label: 'Your Choice',
                  style: TextStyleTypes.SHORT,
                  placeholder: 'Pick from your options above',
                  required: true,
                  max_length: 100,
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'amount_input',
                  label: 'Bet Amount',
                  style: TextStyleTypes.SHORT,
                  placeholder: 'Credits to bet',
                  required: true,
                  max_length: 10,
                },
              ],
            },
          ],
        },
      });
    }

    // /bet command - show modal for betting
    if (name === 'bet') {
      const predictionId = options.find(opt => opt.name === 'prediction_id').value;
      const prediction = await getPrediction(predictionId);

      if (!prediction) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} not found. Use \`/predictions\` to see active predictions.`,
            flags: 64,
          },
        });
      }

      if (prediction.resolved) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} is already resolved.`,
            flags: 64,
          },
        });
      }

      // Show modal for betting (same as button click)
      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `bet_modal_${predictionId}`,
          title: `Bet on Prediction #${predictionId}`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'option_input',
                  label: 'Choose an option',
                  style: TextStyleTypes.SHORT,
                  placeholder: buildOptionsPlaceholder(prediction.options),
                  required: true,
                  max_length: 100,
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'bet_amount_input',
                  label: 'Bet Amount',
                  style: TextStyleTypes.SHORT,
                  placeholder: 'Credits to bet',
                  required: true,
                  max_length: 10,
                },
              ],
            },
          ],
        },
      });
    }

    // /predictions command - view all active predictions
    if (name === 'predictions') {
      const activePredictions = await getActivePredictions();

      if (activePredictions.length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '📋 No active predictions. Create one with `/predict`!',
            flags: 64,
          },
        });
      }

      let message = '📋 **Active Predictions:**\n\n';
      const components = [];

      for (const pred of activePredictions.slice(0, 5)) { // Limit to 5 for space
        const totalPot = pred.bets.reduce((sum, bet) => sum + bet.amount, 0);
        const createdAt = formatTimestamp(pred.createdAt);
        message += `**ID ${pred.id}:** ${pred.question}\n`;
        message += `**Options:** ${pred.options.join(', ')}\n`;
        message += `🕒 Created: ${createdAt}\n`;
        message += `💰 Total pot: ${totalPot} credits | 🎲 ${pred.bets.length} bet(s)\n\n`;

        // Add a "Bet on this" button for each prediction
        components.push({
          type: MessageComponentTypes.ACTION_ROW,
          components: [
            {
              type: MessageComponentTypes.BUTTON,
              style: ButtonStyleTypes.PRIMARY,
              label: `Bet on #${pred.id}`,
              custom_id: `bet_${pred.id}`,
            },
          ],
        });
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
          components: components,
        },
      });
    }

    // /mybets command - view your active bets
    if (name === 'mybets') {
      const userBets = await getUserBets(userId);

      if (userBets.length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '🎲 You have no active bets.',
            flags: 64,
          },
        });
      }

      let message = '🎲 **Your Active Bets:**\n\n';
      for (const betInfo of userBets) {
        message += `**ID ${betInfo.predictionId}:** ${betInfo.question}\n`;
        message += `Your bet: **${betInfo.bet.prediction}** (${betInfo.bet.amount} credits)\n\n`;
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
          flags: 64,
        },
      });
    }

    // /resolve command - admin only
    if (name === 'resolve') {
      // Check if user is admin
      if (!ADMIN_IDS.includes(userId)) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You do not have permission to use this command.',
            flags: 64,
          },
        });
      }

      const predictionId = options.find(opt => opt.name === 'prediction_id').value;
      const prediction = await getPrediction(predictionId);

      if (!prediction) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} not found.`,
            flags: 64,
          },
        });
      }

      // Show modal with options in placeholder
      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `resolve_modal_${predictionId}`,
          title: `Resolve Prediction #${predictionId}`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'outcome_input',
                  label: 'Winning Outcome',
                  style: TextStyleTypes.SHORT,
                  placeholder: buildOptionsPlaceholder(prediction.options),
                  required: true,
                  max_length: 100,
                },
              ],
            },
          ],
        },
      });
    }

    // /voidprediction command - admin only
    if (name === 'voidprediction') {
      // Check if user is admin
      if (!ADMIN_IDS.includes(userId)) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You do not have permission to use this command.',
            flags: 64,
          },
        });
      }

      const predictionId = options.find(opt => opt.name === 'prediction_id').value;
      const prediction = await getPrediction(predictionId);

      if (!prediction) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} not found.`,
            flags: 64,
          },
        });
      }

      const result = await voidPrediction(predictionId);

      if (!result.success) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ ${result.error}`,
            flags: 64,
          },
        });
      }

      let message = `✅ **Prediction #${predictionId} Voided!**\n\n`;
      message += `**Question:** ${prediction.question}\n`;
      message += `**Total Pot Returned:** ${result.totalPot} credits\n\n`;

      if (result.refunds.length === 0) {
        message += '💸 No bets to refund.';
      } else {
        message += '💸 **Refunds:**\n';
        for (const refund of result.refunds) {
          message += `<@${refund.userId}> received **${refund.amount}** credits back\n`;
        }
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
        },
      });
    }

    // /changebalance command - admin only
    if (name === 'changebalance') {
      // Check if user is admin
      if (!ADMIN_IDS.includes(userId)) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You do not have permission to use this command.',
            flags: 64,
          },
        });
      }

      const targetUser = options.find(opt => opt.name === 'user').value;
      const action = options.find(opt => opt.name === 'action').value;
      const amount = options.find(opt => opt.name === 'amount').value;

      let changeAmount;
      if (action === 'set') {
        const currentBalance = await getUserBalance(targetUser);
        changeAmount = amount - currentBalance;
      } else {
        changeAmount = action === 'add' ? amount : -amount;
      }

      const result = await changeBalance(targetUser, changeAmount);

      if (!result.success) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ ${result.error}`,
            flags: 64,
          },
        });
      }

      let actionText;
      if (action === 'set') {
        actionText = `set to ${amount} credits for`;
      } else {
        actionText = action === 'add' ? 'added to' : 'removed from';
        actionText = `${amount} credits ${actionText}`;
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ ${actionText} <@${targetUser}>'s balance.\n**Old balance:** ${result.oldBalance}\n**New balance:** ${result.newBalance}`,
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  /**
   * Handle modal submissions
   */
  if (type === InteractionType.MODAL_SUBMIT) {
    const { custom_id, components } = data;

    // Handle debug SQL modal
    if (custom_id === 'debug_sql_modal') {
      // Admin check
      if (!ADMIN_IDS.includes(userId)) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You do not have permission to execute SQL queries.',
            flags: 64,
          },
        });
      }

      const sqlQuery = components[0].components[0].value;

      try {
        const result = await query(sqlQuery);

        if (!result.rows || result.rows.length === 0) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `✅ Query executed.\n\`\`\`\nRows affected: ${result.rowCount}\n\`\`\``,
              flags: 64,
            },
          });
        }

        // Format results as a table
        const rows = result.rows;
        const keys = Object.keys(rows[0]);

        // Calculate column widths
        const widths = keys.map(key => {
          const headerLen = key.length;
          const maxDataLen = Math.max(...rows.map(row => String(row[key] ?? 'NULL').length));
          return Math.min(Math.max(headerLen, maxDataLen), 20); // Cap at 20 chars
        });

        // Build table
        let table = '```\n';

        // Header
        table += keys.map((key, i) => key.padEnd(widths[i])).join(' | ') + '\n';
        table += keys.map((key, i) => '-'.repeat(widths[i])).join('-+-') + '\n';

        // Rows
        for (const row of rows.slice(0, 15)) {
          table += keys.map((key, i) => {
            const val = String(row[key] ?? 'NULL').substring(0, widths[i]);
            return val.padEnd(widths[i]);
          }).join(' | ') + '\n';
        }

        if (rows.length > 15) {
          table += `... and ${rows.length - 15} more rows\n`;
        }

        table += '```';

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `✅ Query executed. (${result.rowCount} rows)\n\n${table}`,
            flags: 64,
          },
        });
      } catch (err) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ SQL Error:\n\`\`\`\n${err.message}\n\`\`\``,
            flags: 64,
          },
        });
      }
    }

    // Handle prediction creation modal
    if (custom_id === 'predict_modal') {
      const question = components[0].components[0].value;
      const optionsStr = components[1].components[0].value;
      const yourChoice = components[2].components[0].value;
      const amountStr = components[3].components[0].value;
      const amount = parseInt(amountStr);

      // Validate amount is a number
      if (isNaN(amount) || amount < 1) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Amount must be a positive number.',
            flags: 64,
          },
        });
      }

      // Parse options (comma-separated)
      const predefinedOptions = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

      if (predefinedOptions.length < 2) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ You must provide at least 2 options (comma-separated).',
            flags: 64,
          },
        });
      }

      // Validate that creator's choice is in the options
      const validChoice = predefinedOptions.find(opt => opt.toLowerCase() === yourChoice.toLowerCase());
      if (!validChoice) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Your choice must match one of the options exactly.\nOptions: ${predefinedOptions.join(', ')}`,
            flags: 64,
          },
        });
      }

      const balance = await getUserBalance(userId);
      if (balance < amount) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Insufficient credits. You have ${balance} credits but need ${amount}.`,
            flags: 64,
          },
        });
      }

      const createResult = await createPrediction(userId, question, predefinedOptions, validChoice, amount);
      if (!createResult.success) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ ${createResult.error}`,
            flags: 64,
          },
        });
      }
      const predictionId = createResult.predictionId;

      const successMessage = `✅ Prediction created!\n\n**ID:** ${predictionId}\n**Question:** ${question}\n**Options:**\n${predefinedOptions.map(opt => `• ${opt}`).join('\n')}\n\n<@${userId}> bet **${amount}** credits on: **${validChoice}**\n\nOthers can bet using \`/bet ${predictionId}\` or \`/predictions\`!`;

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: successMessage,
        },
      });
    }

    // Handle bet modal submission
    if (custom_id.startsWith('bet_modal_')) {
      const predictionId = parseInt(custom_id.split('_')[2]);
      const selectedOption = components[0].components[0].value;
      const amountStr = components[1].components[0].value;
      const amount = parseInt(amountStr);

      if (isNaN(amount) || amount < 1) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❌ Amount must be a positive number.',
            flags: 64,
          },
        });
      }

      const prediction = await getPrediction(predictionId);
      if (!prediction) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} not found.`,
            flags: 64,
          },
        });
      }

      const result = await placeBet(predictionId, userId, selectedOption, amount);

      if (!result.success) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ ${result.error}`,
            flags: 64,
          },
        });
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `✅ Bet placed!\n\n**Prediction #${predictionId}:** ${prediction.question}\n<@${userId}> bet **${amount}** credits on: **${selectedOption}**`,
        },
      });
    }

    // Handle resolve modal submission
    if (custom_id.startsWith('resolve_modal_')) {
      const predictionId = parseInt(custom_id.split('_')[2]);
      const outcome = components[0].components[0].value;

      const prediction = await getPrediction(predictionId);
      if (!prediction) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} not found.`,
            flags: 64,
          },
        });
      }

      const result = await resolvePrediction(predictionId, outcome);

      if (!result.success) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ ${result.error}`,
            flags: 64,
          },
        });
      }

      let message = `✅ **Prediction #${predictionId} Resolved!**\n\n`;
      message += `**Question:** ${prediction.question}\n`;
      message += `**Outcome:** ${outcome}\n`;
      message += `**Total Pot:** ${result.totalPot} credits\n\n`;

      if (result.winners.length === 0) {
        message += '❌ No winners. All bets lost.';
      } else {
        message += '🎉 **Winners:**\n';
        for (const winner of result.winners) {
          message += `<@${winner.userId}> won **${winner.winnings}** credits (profit: **${winner.profit}**)\n`;
        }
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: message,
        },
      });
    }
  }

  /**
   * Handle button clicks
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id } = data;

    // Handle bet button clicks
    if (custom_id.startsWith('bet_')) {
      const predictionId = parseInt(custom_id.split('_')[1]);
      const prediction = await getPrediction(predictionId);

      if (!prediction) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Prediction #${predictionId} not found.`,
            flags: 64,
          },
        });
      }

      const optionsPlaceholder = buildOptionsPlaceholder(prediction.options);

      // Show modal for betting
      return res.send({
        type: InteractionResponseType.MODAL,
        data: {
          custom_id: `bet_modal_${predictionId}`,
          title: `Bet on Prediction #${predictionId}`,
          components: [
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'option_input',
                  label: 'Choose an option',
                  style: TextStyleTypes.SHORT,
                  placeholder: optionsPlaceholder,
                  required: true,
                  max_length: 100,
                },
              ],
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.INPUT_TEXT,
                  custom_id: 'bet_amount_input',
                  label: 'Bet Amount',
                  style: TextStyleTypes.SHORT,
                  placeholder: 'Credits to bet',
                  required: true,
                  max_length: 10,
                },
              ],
            },
          ],
        },
      });
    }

    // Handle reset confirmation buttons
    if (custom_id === 'confirm_reset_yes') {
      const result = await resetDatabase();
      if (!result.success) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `❌ Reset failed: ${result.error}`,
            flags: 64,
          },
        });
      }

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '💥 **Database reset complete!** All tables truncated.',
          flags: 64,
        },
      });
    }

    if (custom_id === 'confirm_reset_no') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: '✋ Reset cancelled.',
          flags: 64,
        },
      });
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
