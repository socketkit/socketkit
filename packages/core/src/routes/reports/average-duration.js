import { verify } from '../../hooks.js'
import f from '../../server.js'

export default {
  method: 'GET',
  path: '/average-duration',
  schema: {
    querystring: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          format: 'date',
        },
        end_date: {
          type: 'string',
          format: 'date',
        },
        interval: {
          type: 'string',
          default: 'week',
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          available_filters: {
            type: 'array',
            items: { type: 'string' },
          },
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                primary: { type: 'string' },
                average_trial_duration: { type: 'number' },
                average_subscription_duration: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  preHandler: verify,
  handler: async ({ accounts: [account], query }) => {
    if (!account) {
      throw f.httpErrors.notFound(`Account not found`)
    }

    return f.grpc.reports.averageDuration({
      account_id: account.account_id,
      start_date: query.start_date,
      end_date: query.end_date,
      interval: `1 ${query.interval}`,
    })
  },
}