import { BaseManager } from '~/managers/manager'
import {
  Blindtest,
  BlindtestOptions,
  Bonus,
  computeBonusSentence,
  PAUSE_DURATION,
  POINTS_PER_ARTIST,
  POINTS_PER_TITLE,
} from '~/entities/blindtest'
import { Logger } from '~/services/logger'
import { Player } from '~/entities/player'
import { Bot } from '~/bot'
import { Song } from '~/entities/song'
import {
  DMChannel,
  Message,
  NewsChannel,
  StreamDispatcher,
  TextChannel,
  VoiceConnection,
} from 'discord.js'
import { t } from '~/translations'
import { autoProvideEmojis } from '~/utils/emojis'
import { SONG_INFO_EMBED } from '~/utils/embeds'
import { MessageIds } from '~/translations/messages'

type Channel = TextChannel | NewsChannel | DMChannel

export class BlindtestManager extends BaseManager {
  public blindtests: Map<string, Blindtest | null> = new Map()
  private _streamDispatchers: Map<string, StreamDispatcher | null> = new Map()
  private _connections: Map<string, VoiceConnection | null> = new Map()
  private _channels: Map<string, Channel | null> = new Map()

  constructor(protected bot: Bot) {
    super(bot)
  }

  public getName(): string {
    return 'BlindtestManager'
  }

  public createBlindtest(
    owner: Player,
    message: Message,
    options?: BlindtestOptions
  ): void {
    if (!message.guild) throw new Error('No guild!')
    const blindtest = new Blindtest(options, message.guild.id).setOwner(owner)
    this.blindtests.set(message.guild.id, blindtest)
    this._channels.set(message.guild.id, message.channel)
    this.initListeners(blindtest)
    Logger.success(`Created blindtest with owner ${owner.toString()}`)
  }

  public async startBlindtest(message: Message): Promise<void> {
    if (!message.guild) throw new Error('No guild!')
    if (
      this.blindtests.has(message.guild?.id) &&
      message.member?.voice.channel
    ) {
      const blindtest = this.blindtests.get(message.guild.id)!
      message.channel.send(
        t('blindtest.will-start', {
          players: blindtest.players.map(p => `<@${p.id}>`).join(', '),
        })
      )
      this._connections.set(
        message.guild.id,
        await message.member.voice.channel.join()
      )
      await blindtest.start()
    } else {
      message.channel.send(
        t('blindtest.needs-vocal-channel', {
          ...autoProvideEmojis(message.guild),
        })
      )
    }
  }

  public endBlindtest = (blindtest: Blindtest): void => {
    this.removeListeners(blindtest)
    this.blindtests.set(blindtest.guildId, null)
    if (this._connections.has(blindtest.guildId)) {
      this._connections.get(blindtest.guildId)!.disconnect()
      this._streamDispatchers.set(blindtest.guildId, null)
    }
    Logger.success('Deleted blindtest')
  }

  private onSongChanged = async (song: Song, blindtest: Blindtest) => {
    if (this._connections.has(blindtest.guildId)) {
      this._streamDispatchers.set(
        blindtest.guildId,
        this._connections.get(blindtest.guildId)!.play(song.url)
      )
      this.blindtests.get(blindtest.guildId)?.createTimeout()
    }
  }

  private onMessage = async (message: Message): Promise<void> => {
    if (message.author.bot || message.partial || !message.member) return
    if (!message.guild) throw new Error('No guild!')
    const blindtest = this.blindtests.get(message.guild.id)
    if (
      blindtest &&
      blindtest.isRunning &&
      blindtest.currentSong &&
      blindtest.hasMemberJoined(message.member)
    ) {
      const { foundTitle, foundArtist } = blindtest.guessSong(message)
      if (foundTitle && foundArtist) {
        await this.prepareNextSong({
          currentSong: blindtest.currentSong,
          blindtest,
        })
      }
    }
  }

  private onEnd = async (blindtest: Blindtest): Promise<void> => {
    const guildBlindtest = this.blindtests.get(blindtest.guildId)
    const channel = this._channels.get(blindtest.guildId)

    if (channel && guildBlindtest) {
      channel.send(t('blindtest.finished'))
      channel.send(guildBlindtest.scores)
      this.endBlindtest(blindtest)
      await this.bot.leaderboardManager.saveBlindtest(blindtest)
    }
  }

  private onArtistsFound = (
    artists: string[],
    player: Player,
    message: Message,
    bonus: Bonus
  ): void => {
    const pts = bonus + POINTS_PER_ARTIST
    message.channel.send(
      `${t('blindtest.on-artist-found', {
        pts,
        user: player.displayName,
        ...autoProvideEmojis(message.guild),
      })} ${bonus > 0 ? computeBonusSentence(bonus) : ''}`
    )
  }

  private onTitleFound = (
    title: string,
    player: Player,
    message: Message,
    bonus: Bonus
  ): void => {
    const pts = bonus + POINTS_PER_TITLE
    message.channel.send(
      `${t('blindtest.on-music-found', {
        ...autoProvideEmojis(message.guild),
        pts,
        user: player.displayName,
      })} ${bonus > 0 ? computeBonusSentence(bonus) : ''}`
    )
  }

  private onNewOwnerRequest = (owner: Player, blindtest: Blindtest): void => {
    const guildBlindtest = this.blindtests.get(blindtest.guildId)
    const channel = this._channels.get(blindtest.guildId)
    if (channel && guildBlindtest) {
      channel.send(
        t('blindtest.owner-left', {
          user: owner.displayName,
          ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
        })
      )
      guildBlindtest.setOwner(owner)
    }
  }

  private onMaxDurationExceeded = async (
    currentSong: Song,
    blindtest: Blindtest
  ): Promise<void> => {
    await this.prepareNextSong({
      blindtest,
      currentSong,
      message: 'blindtest.max-duration-exceeded',
      values: {
        song: currentSong.title,
        ...autoProvideEmojis(
          this.bot.client.guilds.cache.get(blindtest.guildId)
        ),
      },
    })
  }

  private onSongSkipped = async (
    currentSong: Song,
    blindtest: Blindtest
  ): Promise<void> => {
    await this.prepareNextSong({
      blindtest,
      currentSong,
      message: 'blindtest.on-song-skipped',
      values: {
        ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
      },
    })
  }

  private onSkipVote = (voter: Player, blindtest: Blindtest): void => {
    const guildBlindtest = this.blindtests.get(blindtest.guildId)
    const channel = this._channels.get(blindtest.guildId)
    if (channel && guildBlindtest) {
      channel.send(
        t('blindtest.on-skip-vote', {
          voter: voter.displayName,
          currentVotes: blindtest.voteSkips.length,
          maxVotes: blindtest.majorityVotesCount,
          ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
        })
      )
    }
  }

  private prepareNextSong = async ({
    blindtest,
    currentSong,
    message,
    values,
  }: {
    blindtest: Blindtest
    currentSong: Song
    message?: MessageIds
    values?: Record<string, any>
  }) => {
    const guildBlintest = this.blindtests.get(blindtest.guildId)
    const channel = this._channels.get(blindtest.guildId)
    const streamDispatcher = this._streamDispatchers.get(blindtest.guildId)
    if (channel && guildBlintest && guildBlintest.isWaiting) {
      if (streamDispatcher) {
        streamDispatcher.pause(true)
      }
      if (message) {
        await channel.send(`${t(message, values)}`)
      }
      await channel.send(SONG_INFO_EMBED(currentSong))
      if (guildBlintest.hasNextSong) {
        await channel.send(
          [
            t('blindtest.next-song-within', {
              duration: PAUSE_DURATION / 1000,
            }),
            '\n',
            ...(guildBlintest.showScoreAfterEachSong
              ? [t('global.separator'), guildBlintest.scores]
              : []),
          ].join('')
        )
        await guildBlintest.wait(PAUSE_DURATION)
      }
      guildBlintest.nextSong()
    }
  }

  private initListeners(blindtest: Blindtest): void {
    blindtest.on('end', this.onEnd)
    blindtest.on('new-owner-request', this.onNewOwnerRequest)
    blindtest.on('no-player', this.endBlindtest)
    blindtest.on('max-duration-exceeded', this.onMaxDurationExceeded)
    blindtest.on('on-song-skipped', this.onSongSkipped)
    blindtest.on('on-skip-vote', this.onSkipVote)
    blindtest.on('on-song-changed', this.onSongChanged)
    blindtest.on('on-artists-found', this.onArtistsFound)
    blindtest.on('on-title-found', this.onTitleFound)
    this.bot.client.on('message', this.onMessage)
  }

  private removeListeners(blindtest: Blindtest): void {
    blindtest.removeAllListeners()
    this.bot.client.off('message', this.onMessage)
  }
}
