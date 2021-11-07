import { setTimeout } from 'timers/promises'

import fetchIntegrations from './fetch-integrations.js'
import deleteIntegrations from './delete-integrations.js'
import validateRevenues from './validate-revenues.js'

import Logger from '../logger.js'

const logger = Logger.create().withScope('tasks')

export async function runTasks() {
  if (process.env.NODE_ENV === 'test') {
    return
  }
  const tasks = [fetchIntegrations, validateRevenues, deleteIntegrations]

  for (const task of tasks) {
    logger.info(`Checking whether anything to do in task "${task.name}"...`)
    try {
      while (await task());
    } catch (error) {
      logger.fatal(error)
    }
  }

  logger.info('All done.  Sleeping for a minute...')
  await setTimeout(60000)
  await runTasks()
}