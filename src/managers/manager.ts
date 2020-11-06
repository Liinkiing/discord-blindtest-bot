import { Bot } from '~/bot'
import { Logger } from '~/services/logger'
import chalk from 'chalk'

export abstract class BaseManager {
  public abstract getName(): string

  constructor(protected bot: Bot) {
    Logger.info(`"${chalk.yellow(this.getName())}" ready perfectly`)
  }
}
