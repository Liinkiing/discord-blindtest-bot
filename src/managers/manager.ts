import { Bot } from '~/bot'
import { Logger } from '~/services/logger'
import chalk from 'chalk'

export abstract class BaseManager {
  constructor(protected bot: Bot) {
    Logger.info(`"${chalk.yellow(this.constructor.name)}" ready perfectly`)
  }
}
