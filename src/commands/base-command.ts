import { Bot } from '~/bot'
import { Message } from 'discord.js'
import { Logger } from '~/services/logger'
import chalk from 'chalk'

export type Command = {
  bot: Bot
  message: Message
  args: string[]
  name: string
}

export abstract class BaseCommand {
  protected _prefix = '!'
  protected _name = ''

  constructor(protected bot: Bot) {
    this.bot.client.on('message', async message => {
      if (message.author.bot || message.partial) return
      if (!message.content.startsWith(this._prefix)) return
      const [name, ...args] = message.content.substring(1).split(' ')
      if (name !== this._name) return

      await this.execute({
        bot: this.bot,
        args,
        name,
        message,
      })
    })
    Logger.info(`"${chalk.yellow(this.constructor.name)}" ready perfectly`)
  }

  get name(): string {
    return this._name
  }

  get prefix(): string {
    return this._prefix
  }

  public abstract async execute(command: Command): Promise<void>
}
