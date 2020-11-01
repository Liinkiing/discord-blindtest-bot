import { Bot } from '~/bot'
import { Message } from 'discord.js'

export type Command = {
  bot: Bot
  message: Message
  args: string[]
  name: string
}

export abstract class BaseCommand {
  protected prefix = '!'
  protected name = ''

  constructor(protected bot: Bot) {
    this.bot.client.on('message', async message => {
      if (message.author.bot || message.partial) return
      if (!message.content.startsWith(this.prefix)) return
      const [name, ...args] = message.content.substring(1).split(' ')
      if (name !== this.name) return

      await this.execute({
        bot: this.bot,
        args,
        name,
        message,
      })
    })
  }

  public abstract async execute(command: Command): Promise<void>
}
