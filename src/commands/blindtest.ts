import { BaseCommand, Command } from '~/commands/base-command'
import { Player } from '~/entities/player'

type Options = 'start' | 'join' | 'leave' | 'end'

export class BlindtestCommand extends BaseCommand {
  _name = 'blindtest'

  public async execute({
    bot,
    args,
    message,
    name,
  }: Command<[Options]>): Promise<void> {
    const [option] = args
    switch (option) {
      case 'start':
        this.handleStart({ bot, args, message, name })
        break
      case 'join':
        this.handleJoin({ bot, args, message, name })
        break
      case 'leave':
        this.handleLeave({ bot, args, message, name })
        break
      case 'end':
        this.handleEnd({ bot, args, message, name })
        break
    }
  }

  private handleStart({ bot, message }: Command) {
    if (bot.blindtestManager.blindtest) {
      message.reply(
        `Un blindtest créé par ${bot.blindtestManager.blindtest.owner.displayName} est déjà en cours`
      )
    } else {
      message.reply('Y a R frérot go game sale')
      if (message.member) {
        bot.blindtestManager.createBlindtest(
          new Player({
            id: message.member.id,
            displayName: message.member.displayName,
          })
        )
      }
    }
  }

  private handleEnd({ bot, message }: Command) {
    if (bot.blindtestManager.blindtest) {
      message.reply("J'arrête le blindtest.")
      bot.blindtestManager.endBlindtest()
    } else {
      message.reply(
        `Y a aucun blindtest en cours mon reuf. '!blindtest start' pour en créér un.`
      )
    }
  }

  private handleJoin({ bot, message }: Command) {
    if (!bot.blindtestManager.blindtest) {
      message.reply(
        "Aucun blindtest n'est en cours. '!blindtest start' pour en créér un."
      )
    } else {
      message.reply('Bonsoir grand étalon, bienvenue dans le blindtest')
    }
  }

  private handleLeave({ bot, message }: Command) {
    if (
      bot.blindtestManager.blindtest &&
      message.member &&
      bot.blindtestManager.blindtest.hasMemberJoined(message.member)
    ) {
      bot.blindtestManager.blindtest.removePlayer(message.member.id)
      message.reply("Tu ne fais plus parti du blindtest :'(")
    } else {
      message.reply("BAKA BAKAAA BAKAAA tu n'es dans aucun blindtest")
    }
  }
}
