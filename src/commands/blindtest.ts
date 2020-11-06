import yargs from 'yargs'
import { uniq, flatten } from 'lodash'
import { BaseCommand, Command } from '~/commands/base-command'
import { Player } from '~/entities/player'
import AirtableApiClient from '~/services/airtable-api'
import { t } from '~/translations'
import { autoProvideEmojis } from '~/utils/emojis'

type Options =
  | 'start'
  | 'players'
  | 'create'
  | 'join'
  | 'skip'
  | 'delete'
  | 'leave'
  | 'stop'
  | 'categories'

export class BlindtestCommand extends BaseCommand {
  _name = 'bt'

  public async execute({
    bot,
    args,
    message,
    name,
  }: Command<[Options, string]>): Promise<void> {
    const [option] = args
    const argv = yargs(args)
      .option('limit', { alias: 'l', boolean: false, number: true, default: 0 })
      .option('skipArtists', { alias: 's', boolean: true, default: false })
      .option('boardSong', { alias: 'b', boolean: true, default: true })
      .option('categories', {
        alias: 'c',
        array: true,
        default: [],
      }).argv
    switch (option) {
      case 'skip':
        this.handleSkip({ bot, args, message, name })
        break
      case 'categories':
        this.handleCategories({ bot, args, message, name })
        break
      case 'start':
        this.handleStart({ bot, args, message, name })
        break
      case 'delete':
        this.handleDelete({ bot, args, message, name })
        break
      case 'players':
        this.handlePlayers({ bot, args, message, name })
        break
      case 'create':
        this.handleCreate({ bot, args, message, name }, argv)
        break
      case 'join':
        this.handleJoin({ bot, args, message, name })
        break
      case 'leave':
        this.handleLeave({ bot, args, message, name })
        break
      case 'stop':
        this.handleStop({ bot, args, message, name })
        break
    }
  }

  private async handleCategories({ message }: Command) {
    const response = await AirtableApiClient.songs()
      .select({
        fields: ['Genres'],
      })
      .all()
    const categories = uniq(flatten(response.map(r => r.get('Genres'))))
    message.reply(
      t('blindtest.commands.categories', { categories: categories.join(' | ') })
    )
  }

  private handleSkip({ message, bot }: Command) {
    if (!bot.blindtestManager.blindtest?.isRunning) return
    const player = bot.blindtestManager.blindtest.players.find(
      p => p.id === message.member?.id
    )
    if (!player) return
    bot.blindtestManager.blindtest.addVoteSkip(player)
  }

  private handleStart({ bot, message }: Command) {
    if (
      bot.blindtestManager.blindtest &&
      bot.blindtestManager.blindtest.isRunning
    ) {
      message.reply(t('blindtest.already-started'))
    } else if (
      bot.blindtestManager.blindtest &&
      message.author.id === bot.blindtestManager.blindtest.owner.id
    ) {
      bot.blindtestManager.startBlindtest(message)
    } else if (bot.blindtestManager.blindtest) {
      message.reply(
        t('blindtest.only-owner-can-start', {
          ...autoProvideEmojis(message.guild),
          owner: bot.blindtestManager.blindtest.owner.displayName,
        })
      )
    }
  }

  private handleDelete({ bot, message }: Command) {
    if (
      bot.blindtestManager.blindtest &&
      !bot.blindtestManager.blindtest.isRunning &&
      message.author.id === bot.blindtestManager.blindtest.owner.id
    ) {
      bot.blindtestManager.blindtest.emit('end')
      message.reply(
        t('blindtest.deleted', {
          ...autoProvideEmojis(message.guild),
        })
      )
    }
  }

  private handleStop({ bot, message }: Command) {
    if (
      bot.blindtestManager.blindtest &&
      message.author.id === bot.blindtestManager.blindtest.owner.id
    ) {
      message.reply(
        t('blindtest.stopping', {
          ...autoProvideEmojis(message.guild),
        })
      )
      bot.blindtestManager.blindtest?.emit('end')
    } else if (bot.blindtestManager.blindtest) {
      message.reply(
        t('blindtest.only-owner-can-stop', {
          ...autoProvideEmojis(message.guild),
          owner: bot.blindtestManager.blindtest.owner.displayName,
        })
      )
    } else {
      message.reply(t('blindtest.no-pending-blindtests'))
    }
  }

  private handleJoin({ bot, message }: Command) {
    if (!bot.blindtestManager.blindtest) {
      message.reply(t('blindtest.no-pending-blindtests'))
    } else if (
      bot.blindtestManager.blindtest &&
      message.member &&
      bot.blindtestManager.blindtest.hasMemberJoined(message.member)
    ) {
      message.reply(
        t('blindtest.already-joined', {
          ...autoProvideEmojis(message.guild),
        })
      )
    } else if (
      bot.blindtestManager.blindtest &&
      message.member &&
      bot.blindtestManager.blindtest.isRunning
    ) {
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
        bot.blindtestManager.blindtest.addPlayer(new Player(message.member))
      }
    }
  }

  private handleLeave({ bot, message }: Command) {
    if (
      bot.blindtestManager.blindtest &&
      message.member &&
      bot.blindtestManager.blindtest.hasMemberJoined(message.member)
    ) {
      bot.blindtestManager.blindtest.removePlayer(message.member)
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
    if (bot.blindtestManager.blindtest) {
      message.reply(
        t('blindtest.already-created-by', {
          user: bot.blindtestManager.blindtest.owner.displayName,
        })
      )
    } else {
      if (message.member) {
        bot.blindtestManager.createBlindtest(
          new Player(message.member),
          message.channel,
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
    if (bot.blindtestManager.blindtest) {
      message.reply(
        t('blindtest.commands.players', {
          ...autoProvideEmojis(message.guild),
        })
      )
      bot.blindtestManager.blindtest.players.forEach(player => {
        message.reply(player.displayName)
      })
    }
  }
}
