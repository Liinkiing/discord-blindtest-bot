import { BaseManager } from '~/managers/manager'
import {
  Blindtest,
  BlindtestOptions,
  Bonus,
  computeBonusSentence,
  PAUSE_DURATION,
  POINTS_PER_ARTIST,
  POINTS_PER_TITLE,
  State,
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
  public blindtest: Blindtest | null = null
  private _channel: Channel | null = null
  private _streamDispatcher: StreamDispatcher | null = null
  private _connection: VoiceConnection | null = null

  constructor(protected bot: Bot) {
    super(bot)
  }

  public createBlindtest(
    owner: Player,
    channel: Channel,
    options?: BlindtestOptions
  ): void {
    this.blindtest = new Blindtest(options).setOwner(owner)
    this._channel = channel
    this.initListeners()
    Logger.success(`Created blindtest with owner ${owner.toString()}`)
  }

  public async startBlindtest(message: Message) {
    if (this.blindtest && message.member?.voice.channel) {
      message.channel.send('@everyone ' + t('blindtest.will-start'))
      this._connection = await message.member.voice.channel.join()
      await this.blindtest.start()
    } else {
      message.channel.send(
        t('blindtest.needs-vocal-channel', {
          ...autoProvideEmojis(message.guild),
        })
      )
    }
  }

  public endBlindtest = (): void => {
    this.removeListeners()
    this.blindtest = null
    if (this._connection) {
      this._connection.disconnect()
      this._streamDispatcher = null
    }
    Logger.success('Deleted blindtest')
  }

  private onSongChanged = async (song: Song) => {
    if (this._connection) {
      this._streamDispatcher = this._connection.play(song.url)
      this.blindtest?.createTimeout()
    }
  }

  private onMessage = async (message: Message): Promise<void> => {
    if (message.author.bot || message.partial || !message.member) return
    if (
      this.blindtest &&
      this.blindtest.isRunning &&
      this.blindtest.currentSong &&
      this.blindtest.hasMemberJoined(message.member)
    ) {
      const { foundTitle, foundArtist } = this.blindtest.guessSong(message)
      if (foundTitle && foundArtist) {
        await this.prepareNextSong({ currentSong: this.blindtest.currentSong })
      }
    }
  }

  private onEnd = (): void => {
    if (this._channel && this.blindtest) {
      if (this.blindtest.state === State.Running) {
        this._channel.send(t('blindtest.finished'))
        this._channel.send(this.blindtest.scores)
      }
      this.endBlindtest()
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

  private onNewOwnerRequest = (owner: Player): void => {
    if (this._channel && this.blindtest) {
      this._channel.send(
        t('blindtest.owner-left', {
          user: owner.displayName,
          ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
        })
      )
      this.blindtest.setOwner(owner)
    }
  }

  private onMaxDurationExceeded = async (currentSong: Song): Promise<void> => {
    await this.prepareNextSong({
      currentSong,
      message: 'blindtest.max-duration-exceeded',
      values: {
        song: currentSong.title,
        ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
      },
    })
  }

  private onSongSkipped = async (currentSong: Song): Promise<void> => {
    await this.prepareNextSong({
      currentSong,
      message: 'blindtest.on-song-skipped',
      values: {
        ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
      },
    })
  }

  private onSkipVote = (voter: Player): void => {
    if (this._channel && this.blindtest) {
      this._channel.send(
        t('blindtest.on-skip-vote', {
          voter: voter.displayName,
          currentVotes: this.blindtest.voteSkips.length,
          maxVotes: this.blindtest.majorityVotesCount,
          ...autoProvideEmojis(this.bot.client.guilds.cache.first()),
        })
      )
    }
  }

  private prepareNextSong = async ({
    currentSong,
    message,
    values,
  }: {
    currentSong: Song
    message?: MessageIds
    values?: Record<string, any>
  }) => {
    if (this._channel && this.blindtest) {
      if (this._streamDispatcher) {
        this._streamDispatcher.pause(true)
      }
      if (message) {
        await this._channel.send(`${t(message, values)}`)
      }
      await this._channel.send(SONG_INFO_EMBED(currentSong))
      if (!this.blindtest) return
      if (this.blindtest.hasNextSong) {
        await this._channel.send(
          [
            t('blindtest.next-song-within', {
              duration: PAUSE_DURATION / 1000,
            }),
            '\n',
            t('global.separator'),
            this.blindtest.scores,
          ].join('')
        )
        await this.blindtest.wait(PAUSE_DURATION)
      }
      this.blindtest.nextSong()
    }
  }

  private initListeners(): void {
    if (this.blindtest) {
      this.blindtest.on('end', this.onEnd)
      this.blindtest.on('new-owner-request', this.onNewOwnerRequest)
      this.blindtest.on('no-player', this.endBlindtest)
      this.blindtest.on('max-duration-exceeded', this.onMaxDurationExceeded)
      this.blindtest.on('on-song-skipped', this.onSongSkipped)
      this.blindtest.on('on-skip-vote', this.onSkipVote)
      this.blindtest.on('on-song-changed', this.onSongChanged)
      this.blindtest.on('on-artists-found', this.onArtistsFound)
      this.blindtest.on('on-title-found', this.onTitleFound)
      this.bot.client.on('message', this.onMessage)
    }
  }

  private removeListeners(): void {
    if (this.blindtest) {
      this.blindtest.removeAllListeners()
      this.bot.client.off('message', this.onMessage)
    }
  }
}
