import pg from '../pg.js'
import dayjs from 'dayjs'

export async function get({
  account_id,
  start_date = dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
  end_date = dayjs().format('YYYY-MM-DD'),
  interval = '1 week',
}) {
  const rows = await pg
    .queryBuilder()
    .select({
      x: pg.raw(`(date_trunc(?, g)::date)::text`, [interval.split(' ')[1]]),
      y0: 'l.count',
    })
    .from(
      pg.raw(`generate_series(?::date, ?::date, ?::interval) AS g`, [
        start_date,
        end_date,
        interval,
      ]),
    )
    .joinRaw(
      `
        CROSS JOIN LATERAL (
          SELECT count(*) AS count
          FROM clients c
          WHERE
            c.account_id = ? AND
            EXISTS (SELECT 1
              FROM client_subscriptions s
              WHERE
                s.account_id = c.account_id AND
                s.client_id = c.client_id AND
                s.active_period && daterange(g::date, (g + ?::interval)::date) AND
                daterange(
                  (lower(s.active_period) + s.free_trial_duration)::date,
                  upper(s.active_period)
                ) && daterange(g::date, (g + ?::interval)::date)
            )
        ) l
      `,
      [account_id, interval, interval],
    )

  return {
    ny: 1,
    rows,
  }
}

export async function getCustomerLifetimeValue({
  report_id,
  account_id,
  start_date = dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
  end_date = dayjs().format('YYYY-MM-DD'),
  interval = '1 week',
}) {
  const rows = await pg
    .queryBuilder()
    .select({
      x: pg.raw(`(date_trunc(?, g)::date)::text`, [interval.split(' ')[1]]),
      y0: 'l.avg_total_base_developer_proceeds',
    })
    .from(
      pg.raw(`generate_series(?::date, ?::date, ?::interval) AS g`, [
        start_date,
        end_date,
        interval,
      ]),
    )
    .joinRaw(
      `
        CROSS JOIN LATERAL (
          SELECT avg(total_base_developer_proceeds) AS avg_total_base_developer_proceeds
          FROM clients c
          WHERE
            c.account_id = ? AND
            EXISTS (SELECT 1
              FROM client_subscriptions s
              WHERE
                s.account_id = c.account_id AND
                s.client_id = c.client_id AND
                s.active_period && daterange(g::date, (g + ?::interval)::date)
            ) AND
            NOT EXISTS (SELECT 1
              FROM client_subscriptions s
              WHERE
                s.account_id = c.account_id AND
                s.client_id = c.client_id AND
                s.active_period && daterange(g::date, (g + ?::interval)::date) AND
                s.active_period @> 'today'::date
            )
        ) l
      `,
      [account_id, interval, interval],
    )

  return {
    ny: 1,
    rows,
  }
}
