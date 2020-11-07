import yargs from 'yargs'
import _ from 'lodash'
import { BaseCommand, Command } from '~/commands/base-command'
import { Player } from '~/entities/player'
import AirtableApiClient from '~/services/airtable-api'
import { t } from '~/translations'
import { autoProvideEmojis } from '~/utils/emojis'
import { MessageEmbed } from 'discord.js'
import { INFO_EMBED, LEADERBOARD_EMBED } from '~/utils/embeds'

type Options =
  | 'leaderboard'
  | 'start'
  | 'players'
  | 'create'
  | 'join'
  | 'skip'
  | 'delete'
  | 'help'
  | 'leave'
  | 'stop'
  | 'categories'

export class BlindtestCommand extends BaseCommand {
  _command = 'bt'

  public getName(): string {
    return 'BlindtestCommand'
  }

  private printHelpText(): MessageEmbed {
    return INFO_EMBED()
  }

  public async execute({
    bot,
    args,
    message,
    command,
  }: Command<[Options, string]>): Promise<void> {
    const [option] = args
    const input = yargs(args)
      .help(false)
      .option('limit', { alias: 'l', boolean: false, number: true, default: 0 })
      .option('skipArtists', { alias: 's', boolean: true, default: false })
      .option('boardSong', { alias: 'b', boolean: true, default: true })
      .option('categories', {
        alias: 'c',
        array: true,
        default: [],
      })
    const argv = input.argv
    switch (option) {
      case 'leaderboard':
        this.handleLeaderboard({ bot, args, message, command })
        break
      case 'skip':
        this.handleSkip({ bot, args, message, command })
        break
      case 'help':
        this.handleHelp({ bot, args, message, command })
        break
      case 'categories':
        this.handleCategories({ bot, args, message, command })
        break
      case 'start':
        this.handleStart({ bot, args, message, command })
        break
      case 'delete':
        this.handleDelete({ bot, args, message, command })
        break
      case 'players':
        this.handlePlayers({ bot, args, message, command })
        break
      case 'create':
        this.handleCreate({ bot, args, message, command }, argv)
        break
      case 'join':
        this.handleJoin({ bot, args, message, command })
        break
      case 'leave':
        this.handleLeave({ bot, args, message, command })
        break
      case 'stop':
        this.handleStop({ bot, args, message, command })
        break
    }
  }

  private async handleCategories({ message }: Command) {
    const response = await AirtableApiClient.songs()
      .select({
        fields: ['Genres'],
      })
      .all()
    const categories = _.uniq(_.flatten(response.map(r => r.get('Genres'))))
    message.reply(
      t('blindtest.commands.categories', { categories: categories.join(' | ') })
    )
  }

  private async handleLeaderboard({ message, bot }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const entries = await bot.leaderboardManager.getLeaderboardForGuild(
      message.guild.id
    )
    if (entries.length === 0) {
      message.channel.send(
        t('leaderboard.empty', { ...autoProvideEmojis(message.guild) })
      )
    } else {
      message.channel.send(LEADERBOARD_EMBED(entries))
    }
  }

  private handleSkip({ message, bot }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (!blindtest?.isRunning) return
    const player = blindtest.players.find(p => p.id === message.member?.id)
    if (!player) return
    blindtest.addVoteSkip(player)
  }

  private handleHelp({ message }: Command) {
    message.reply(this.printHelpText())
  }

  private handleStart({ bot, message }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (blindtest && blindtest.isRunning) {
      message.reply(t('blindtest.already-started'))
    } else if (blindtest && message.author.id === blindtest.owner.id) {
      bot.blindtestManager.startBlindtest(message)
    } else if (blindtest) {
      message.reply(
        t('blindtest.only-owner-can-start', {
          ...autoProvideEmojis(message.guild),
          owner: blindtest.owner.displayName,
        })
      )
    }
  }

  private handleDelete({ bot, message }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (
      blindtest &&
      !blindtest.isRunning &&
      message.author.id === blindtest.owner.id
    ) {
      blindtest.emit('end', blindtest)
      message.reply(
        t('blindtest.deleted', {
          ...autoProvideEmojis(message.guild),
        })
      )
    }
  }

  private handleStop({ bot, message }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (blindtest && message.author.id === blindtest.owner.id) {
      message.channel.send(
        t('blindtest.stopping', {
          ...autoProvideEmojis(message.guild),
        })
      )
      blindtest.emit('end', blindtest)
    } else if (blindtest) {
      message.reply(
        t('blindtest.only-owner-can-stop', {
          ...autoProvideEmojis(message.guild),
          owner: blindtest.owner.displayName,
        })
      )
    } else {
      message.reply(t('blindtest.no-pending-blindtests'))
    }
  }

  private handleJoin({ bot, message }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (!blindtest) {
      message.reply(t('blindtest.no-pending-blindtests'))
    } else if (
      blindtest &&
      message.member &&
      blindtest.hasMemberJoined(message.member)
    ) {
      message.reply(
        t('blindtest.already-joined', {
          ...autoProvideEmojis(message.guild),
        })
      )
    } else if (blindtest && message.member && blindtest.isRunning) {
      message.reply(
        t('blindtest.cant-join-already-started', {
          ...autoProvideEmojis(message.guild),
        })
      )
    } else {
      message.reply(
        t('blindtest.user-joined', { ...autoProvideEmojis(message.guild) })
      )
      if (message.member) {
        blindtest.addPlayer(new Player(message.member))
      }
    }
  }

  private handleLeave({ bot, message }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (
      blindtest &&
      message.member &&
      blindtest.hasMemberJoined(message.member)
    ) {
      blindtest.removePlayer(message.member)
      message.reply(t('blindtest.user-left'))
    } else {
      message.reply(
        t('blindtest.already-joined', {
          ...autoProvideEmojis(message.guild),
        })
      )
    }
  }

  private handleCreate(
    { bot, message }: Command,
    {
      limit,
      categories,
      skipArtists,
      boardSong,
    }: {
      categories: string[]
      limit: number
      skipArtists: boolean
      boardSong: boolean
    }
  ) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (blindtest) {
      message.reply(
        t('blindtest.already-created-by', {
          user: blindtest.owner.displayName,
        })
      )
    } else {
      if (message.member) {
        bot.blindtestManager.createBlindtest(
          new Player(message.member),
          message,
          {
            limit,
            categories,
            skipArtists,
            showScoreAfterEachSong: boardSong,
          }
        )
        message.reply(
          `${t('blindtest.create-success')} ${
            limit > 0 ? t('blindtest.create-limit', { limit }) : ''
          } ${
            categories.length > 0
              ? t('blindtest.create-category', {
                  categories: categories.join(', '),
                })
              : ''
          } ${skipArtists ? t('blindtest.create-skip-artist') : ''}`
        )
      }
    }
  }

  private handlePlayers({ bot, message }: Command) {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = bot.blindtestManager.blindtests.get(message.guild.id)
    if (blindtest) {
      message.reply(
        t('blindtest.commands.players', {
          ...autoProvideEmojis(message.guild),
        })
      )
      blindtest.players.forEach(player => {
        message.reply(player.displayName)
      })
    }
  }
}
