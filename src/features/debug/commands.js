export const DEBUG_COMMANDS = [
  {
    name: 'debug',
    description: '[ADMIN] Debug database info',
    options: [
      {
        type: 1,
        name: 'stats',
        description: 'Show overall database stats',
      },
      {
        type: 1,
        name: 'prediction',
        description: 'Inspect a prediction and its bets',
        options: [
          {
            type: 4,
            name: 'prediction_id',
            description: 'The ID of the prediction',
            required: true,
            min_value: 1,
          },
        ],
      },
      {
        type: 1,
        name: 'user',
        description: 'Inspect a user balance and bets',
        options: [
          {
            type: 6,
            name: 'user',
            description: 'The user to inspect',
            required: true,
          },
          {
            type: 4,
            name: 'limit',
            description: 'Max bets to show (default 10)',
            required: false,
            min_value: 1,
            max_value: 20,
          },
        ],
      },
      {
        type: 1,
        name: 'recent',
        description: 'Show recent predictions',
        options: [
          {
            type: 4,
            name: 'limit',
            description: 'Max predictions to show (default 5)',
            required: false,
            min_value: 1,
            max_value: 20,
          },
        ],
      },
      {
        type: 1,
        name: 'reset',
        description: 'Reset database (truncate all tables) - DANGEROUS',
      },
      {
        type: 1,
        name: 'sql',
        description: 'Execute a custom SQL query and view results',
      },
    ],
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 2],
  },
];
