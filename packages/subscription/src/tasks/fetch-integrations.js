import _ from 'lodash'
import dayjs from 'dayjs'
import { performance } from 'perf_hooks'
import slug from 'slug'
import AppStoreReporter from 'appstore-reporter'
import { v4 } from 'uuid'

import pg from '../pg/index.js'
import { getExchangeRates } from '../fixer.js'
import Logger from '../logger.js'
import Transaction from '../models/transaction.js'
import RevenueList from '../models/revenue-list.js'
import insertTransaction from '../pg/transaction-insert.js'
import subscriber from '../grpc-client.js'

const logger = Logger.create().withScope('app-store-connect-fetcher')

export default function fetchIntegrations() {
  return pg.transaction(async (trx) => {
    const traceId = v4()
    const integration = await pg
      .select([
        'account_id',
        'state',
        'failed_fetches',
        'last_fetch',
        'vendor_ids',
        'access_token',
      ])
      .from('integrations')
      .where('provider_id', 'apple')
      .andWhere('state', '<', 'suspended')
      .andWhere(
        'last_fetch',
        '<',
        dayjs().subtract(1, 'day').subtract(16, 'hour').format('YYYY-MM-DD'),
      )
      .orderBy(['state', 'failed_fetches', 'last_fetch'])
      .limit(1)
      .forUpdate()
      .skipLocked()
      .first()
      .transacting(trx)

    if (!integration) {
      return false
    }

    const vendor_id = integration.vendor_ids[0]
    let state = 'active'
    let failed_fetches = 0
    let next_day = dayjs(integration.last_fetch).add(1, 'day')
    let transactions = null
    let error_message = null

    logger.info(
      `Processing ${integration.account_id} for ${next_day.format(
        'YYYY-MM-DD',
      )}`,
    )

    try {
      performance.mark(`${traceId}-network-started`)
      const reporter = new AppStoreReporter.default({
        accessToken: integration.access_token,
      })
      transactions = await reporter.sales.getReport({
        vendorNumber: vendor_id,
        reportType: 'Subscriber',
        reportSubType: 'Detailed',
        dateType: 'Daily',
        date: next_day.format('YYYYMMDD'),
        reportVersion: '1_2',
      })
      performance.mark(`${traceId}-network-ended`)
      performance.measure(
        `network-request`,
        `${traceId}-network-started`,
        `${traceId}-network-ended`,
      )
    } catch (error) {
      if (!error.message.includes('404')) {
        state = 'error'
        failed_fetches = integration.failed_fetches + 1
        error_message = error.message
        // We must try to fetch the same date again.
        next_day = dayjs(integration.last_fetch)

        if (!error.message.includes('400')) {
          logger.error(error)
        }
      }
    }

    if (transactions) {
      const valid_transactions = _.orderBy(
        // somehow, some transactions doesn't have any eventDate or subscriberId.
        // eliminate those faulty transactions. TODO: investigate this.
        transactions.filter((t) => !!t.eventDate),
        ['eventDate', 'refund'],
        ['asc', 'desc'],
      )

      const application_ids = _.uniqBy(transactions, 'appAppleId').map((t) => ({
        application_id: t.appAppleId,
        default_country_id: 'us',
        default_language_id: 'EN',
      }))

      performance.mark(`${traceId}-processing`)

      const createApplicationTask =
        application_ids.length > 0
          ? subscriber.store.applications.create(application_ids)
          : Promise.resolve()
      await Promise.all([
        processTransactions(
          {
            account_id: integration.account_id,
            transactions: valid_transactions,
            next_day,
          },
          trx,
        ),
        createApplicationTask,
      ])
      performance.mark(`${traceId}-processing-ended`)
      performance.measure(
        'processing-transactions',
        `${traceId}-processing`,
        `${traceId}-processing-ended`,
      )
    }

    await pg
      .into('integrations')
      .where({
        provider_id: 'apple',
        account_id: integration.account_id,
      })
      .update({
        state: state,
        failed_fetches: failed_fetches,
        last_fetch: next_day.format('YYYY-MM-DD'),
        last_error_message: error_message,
      })
      .transacting(trx)

    return (
      integration.state !== state ||
      !dayjs(integration.last_fetch).isSame(next_day, 'day')
    )
  })
}

async function processTransactions(
  { account_id, transactions, next_day },
  trx,
) {
  const exchange_rates = await getExchangeRates(next_day)

  await pg
    .insert(
      _.uniqBy(transactions, 'device').map((t) => ({
        provider_id: 'apple',
        device_type_id: slug(t.device),
        name: t.device,
      })),
    )
    .into('device_types')
    .onConflict(['provider_id', 'device_type_id'])
    .ignore()
    .transacting(trx)

  await pg
    .insert(
      _.uniqBy(transactions, 'subscriberId').map((t) => ({
        account_id: account_id,
        provider_id: 'apple',
        subscriber_id: t.subscriberId,
        device_type_id: slug(t.device),
        country_id: t.country.toLowerCase(),
        first_interaction: dayjs(t.eventDate).format('YYYY-MM-DD'),
        total_base_subscriber_purchase: 0,
        total_base_developer_proceeds: 0,
      })),
    )
    .into('subscribers')
    .onConflict(['account_id', 'subscriber_id'])
    .ignore()
    .transacting(trx)

  await pg
    .insert(
      _.uniqBy(transactions, 'subscriptionAppleId').map((t) => ({
        account_id: account_id,
        application_id: t.appAppleId,
        subscription_group_id: t.subscriptionGroupId,
        subscription_package_id: t.subscriptionAppleId,
        subscription_duration: t.standardSubscriptionDuration,
        name: t.subscriptionName,
      })),
    )
    .into('subscription_packages')
    .onConflict(['account_id', 'subscription_package_id'])
    .ignore()
    .transacting(trx)

  const revenue_list = new RevenueList(next_day)

  for (const raw of transactions) {
    const transaction = new Transaction(raw, exchange_rates)
    await insertTransaction(transaction, { account_id }, trx)
    revenue_list.addTransaction(transaction)
  }

  await processDailyTransactions(trx, account_id, revenue_list)
}

async function processDailyTransactions(trx, account_id, revenue_list) {
  await pg
    .queryBuilder()
    .transacting(trx)
    .from('revenues')
    .update('is_valid', false)
    .where('account_id', account_id)
    .andWhere(function () {
      for (const { country_id, first_day } of revenue_list) {
        this.orWhere(function () {
          this.where('country_id', country_id)
          this.andWhere('for_date', '>=', first_day.format('YYYY-MM-DD'))
        })
      }
    })

  await pg
    .queryBuilder()
    .transacting(trx)
    .from('revenues')
    .insert(
      Array.from(revenue_list, ({ country_id, first_day }) => ({
        account_id,
        for_date: revenue_list.current_day.format('YYYY-MM-DD'),
        country_id,
      })),
    )

  await pg
    .queryBuilder()
    .transacting(trx)
    .from(pg.raw('revenues (account_id, for_date, country_id)'))
    .insert(function () {
      this.from('revenues AS a')
        .where('account_id', account_id)
        .andWhere('for_date', revenue_list.previous_day.format('YYYY-MM-DD'))
        .andWhere(
          pg.raw(
            'NOT EXISTS (' +
              'SELECT 1 ' +
              'FROM revenues b ' +
              'WHERE a.account_id = b.account_id AND ' +
              'a.country_id = b.country_id AND ' +
              'b.for_date = ?' +
              ')',
            [revenue_list.current_day.format('YYYY-MM-DD')],
          ),
        )
        .select([
          pg.raw('account_id'),
          pg.raw('?', revenue_list.current_day.format('YYYY-MM-DD')),
          pg.raw('country_id'),
        ])
    })
}
