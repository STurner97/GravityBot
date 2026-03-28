export const PINBOARD_COMMANDS = [
  {
    name: 'pinboard',
    description: '[ADMIN] Configure pinboard settings',
    options: [
      {
        type: 1,
        name: 'setchannel',
        description: 'Set the pinboard target channel',
        options: [
          {
            type: 7,
            name: 'channel',
            description: 'Channel to post pinned messages in',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'whitelist_add',
        description: 'Add a channel to the pinboard whitelist',
        options: [
          {
            type: 7,
            name: 'channel',
            description: 'Channel to monitor for pins',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'whitelist_remove',
        description: 'Remove a channel from the pinboard whitelist',
        options: [
          {
            type: 7,
            name: 'channel',
            description: 'Channel to stop monitoring',
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: 'whitelist_list',
        description: 'List all whitelisted channels',
      },
      {
        type: 1,
        name: 'forcepin',
        description: 'Force pin a message (for testing)',
        options: [
          {
            type: 3,
            name: 'message_url',
            description: 'Message link (right-click message > Copy Message Link)',
            required: true,
          },
        ],
      },
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
  },
];
