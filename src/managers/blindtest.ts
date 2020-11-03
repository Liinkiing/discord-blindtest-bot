import { BaseManager } from '~/managers/manager'
import {
  Blindtest,
  BlindtestOptions,
  Bonus,
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
import { wait } from '~/utils/promise'

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
      message.channel.send('@everyone' + ' le blindtest va commencer!')
      this._connection = await message.member.voice.channel.join()
      await this.blindtest.start()
    } else {
      message.channel.send(
        'Wsh mon reuf, tu dois être dans un vocal pour lancer un blindtest'
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
      this.blindtest.hasMemberJoined(message.member)
    ) {
      const { foundTitle, foundArtist } = this.blindtest.guessSong(message)
      if (foundTitle && foundArtist) {
        if (this._streamDispatcher) {
          this._streamDispatcher.pause(true)
        }
        if (this.blindtest.hasNextSong) {
          message.channel.send(
            `Prochaine musique dans ${PAUSE_DURATION / 1000} secondes...`
          )
          await wait(PAUSE_DURATION)
        }
        this.blindtest.nextSong()
      }
    }
  }

  private onEnd = (): void => {
    if (this._channel && this.blindtest) {
      if (this.blindtest.state === State.Running) {
        this._channel.send(
          'Blindtest terminé, merci les kheys, voici les points'
        )
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
    if (bonus === 3) {
      message.channel.send(
        `(+${bonus + POINTS_PER_ARTIST}pts) pour ${
          player.displayName
        } pour avoir ` +
          `trouvé le nom de l'artiste en moins de 3s (t'es un bot c'est pas possible), qui était "${artists.join(
            ', '
          )}".`
      )
    } else if (bonus === 1) {
      message.channel.send(
        `(+${bonus + POINTS_PER_ARTIST}pts) pour ${
          player.displayName
        } pour avoir ` +
          `trouvé le nom de l'artiste en moins de 6s, qui était "${artists.join(
            ', '
          )}".`
      )
    } else {
      message.channel.send(
        `(+${POINTS_PER_ARTIST}pts) pour ${player.displayName}, qui ` +
          `a trouvé le nom de l'artiste, qui était "${artists.join(', ')}".`
      )
    }
  }

  private onTitleFound = (
    title: string,
    player: Player,
    message: Message,
    bonus: Bonus
  ): void => {
    if (bonus === 3) {
      message.channel.send(
        `(+${bonus + POINTS_PER_TITLE}pts) pour ${
          player.displayName
        } pour avoir ` +
          `trouvé le nom de la musique en moins de 3s (t'es un bot c'est pas possible), qui était "${title}".`
      )
    } else if (bonus === 1) {
      message.channel.send(
        `(+${bonus + POINTS_PER_TITLE}pts) pour ${
          player.displayName
        } pour avoir ` +
          `trouvé le nom de la musique en moins de 6s, qui était "${title}".`
      )
    } else {
      message.channel.send(
        `(+${POINTS_PER_TITLE}pts) pour ${player.displayName}, qui ` +
          `a trouvé le nom de la musique, qui était "${title}".`
      )
    }
  }

  private onNewOwnerRequest = (owner: Player): void => {
    if (this._channel && this.blindtest) {
      this._channel.send(
        `Étant donné que le créateur du blindtest est parti (sale lâche), @${owner.displayName} va reprendre la relève. C'est à toi désormais que relève la dure responsabilité de démarrer le blindtest`
      )
      this.blindtest.setOwner(owner)
    }
  }

  private onMaxDurationExceeded = async (currentSong: Song): Promise<void> => {
    if (this._channel && this.blindtest) {
      if (this._streamDispatcher) {
        this._streamDispatcher.pause(true)
      }
      this._channel.send(
        `Le délai maximum a été atteint et personne n'a trouvé :'(. La musique était "${
          currentSong.title
        }"${
          currentSong.artists ? `, par ${currentSong.artists.join(', ')}` : ''
        }`
      )
      if (this.blindtest.hasNextSong) {
        this._channel.send(
          `Prochaine musique dans ${PAUSE_DURATION / 1000} secondes...`
        )
        await wait(PAUSE_DURATION)
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
