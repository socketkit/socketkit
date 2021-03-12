import dayjs from 'dayjs'
import pg from '../pg.js'

export async function create({
  account_id,
  provider_id,
  access_token,
  vendor_ids,
}) {
  return pg
    .queryBuilder()
    .insert({
      last_fetch: dayjs().subtract(9, 'month'),
      account_id,
      provider_id,
      access_token,
      vendor_ids,
      last_error_message: null,
    })
    .into('integrations')
    .onConflict(['account_id', 'provider_id'])
    .ignore()
}

export async function update({ account_id, provider_id, access_token }) {
  return pg
    .queryBuilder()
    .update({ access_token })
    .where({ account_id, provider_id })
    .from('integrations')
    .onConflict(['account_id'])
    .ignore()
}

export async function destroy({ account_id, provider_id }) {
  return pg
    .queryBuilder()
    .update({
      state: 'to_be_deleted',
      last_error_message: 'Deleting integration',
    })
    .from('integrations')
    .where({ account_id, provider_id })
    .onConflict(['account_id', 'provider_id'])
    .ignore()
}

export async function findOne({ account_id, provider_id }) {
  return pg
    .queryBuilder()
    .select('*')
    .from('integrations')
    .where({ account_id, provider_id })
    .first()
}

export async function findAll({ account_id }) {
  return pg
    .queryBuilder()
    .select('*')
    .from('integrations')
    .where({ account_id })
}