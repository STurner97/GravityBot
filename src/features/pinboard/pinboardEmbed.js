import { messageText } from '../../lib/messages/index.js';

const PINBOARD_EMBED_COLOR = 0xED4245;

// Builds the pin post. A broken pin message throws here, before anything is sent or written.
export function buildPinboardEmbed(
  { count, forced = false, messageUrl, messageContent, authorId, createdAt, imageUrl },
  text = messageText
) {
  const timestamp = createdAt
    ? Math.floor(createdAt.getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const heading = forced
    ? text('pinboard.post.forcedHeading')
    : text('pinboard.post.heading', { count });

  const embed = {
    color: PINBOARD_EMBED_COLOR,
    author: { name: heading },
    // Discord rejects an empty description, so a space stands in.
    description: messageContent || ' ',
    fields: [
      {
        name: text('pinboard.post.postedByName'),
        value: text('pinboard.post.postedByValue', { authorId, messageUrl }),
        inline: false,
      },
    ],
    timestamp: new Date(timestamp * 1000).toISOString(),
    url: messageUrl,
  };

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  return embed;
}
