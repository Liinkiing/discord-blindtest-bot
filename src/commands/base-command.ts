import { Bot } from '~/bot'
import { Message } from 'discord.js'
import { Logger } from '~/services/logger'
import chalk from 'chalk'

export type Command<T = string[]> = {
  bot: Bot
  message: Message
  args: T
  command: string
}

export abstract class BaseCommand {
  protected _prefix = '!'
  protected _command = ''

  constructor(protected bot: Bot) {
    this.bot.client.on('message', async message => {
      if (message.author.bot || message.partial) return
      if (!message.content.startsWith(this._prefix)) return
      const [command, ...args] = message.content
        .substring(1)
        .split(/("[^"]*"|'[^']*'|[\S]+)+/)
        .filter(v => v !== '' && v !== ' ')
      if (command !== this._command) return

      await this.execute({
        bot: this.bot,
        args,
        command,
        message,
      })
    })
    Logger.info(`"${chalk.yellow(this.getName())}" ready perfectly`)
  }

  public abstract getName(): string

  get command(): string {
    return this._command
  }

  get prefix(): string {
    return this._prefix
  }

  public abstract execute(command: Command): Promise<void>
}
