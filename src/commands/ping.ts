import { BaseCommand, Command } from '~/commands/base-command'

export class PingCommand extends BaseCommand {
  _name = 'ping'

  public async execute({ bot, args, message, name }: Command): Promise<void> {
    message.channel.send(`${bot.name} te répond pong (name:${name})`)
  }
}
