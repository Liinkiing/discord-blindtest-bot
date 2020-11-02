import { BaseManager } from '~/managers/manager'
import {
  Blindtest,
  BlindtestOptions,
  Bonus,
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
import ytdl from 'ytdl-core'
import YTDownloader from '~/services/yt-downloader'

type Channel = TextChannel | NewsChannel | DMChannel

export class BlindtestManager extends BaseManager {
  public blindtest: Blindtest | null = null
  private _channel: Channel | null = null
  private _streamDsipatcher: StreamDispatcher | null = null
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
      this._streamDsipatcher = null
    }
    Logger.success('Deleted blindtest')
  }

  private onSongChanged = async (song: Song) => {
    if (this._connection) {
      if (this._streamDsipatcher) {
        this._streamDsipatcher.pause(true)
      }
      let infos
      try {
        infos = await ytdl.getBasicInfo(song.url)
      } catch (e) {
        infos = null
      }
      if (
        !infos ||
        infos.player_response.playabilityStatus.status === 'UNPLAYABLE'
      ) {
        Logger.warn(
          `Video ${song.url} is UNPLAYABLE or could not get informations. Skipping it.`
        )
        this.blindtest?.nextSong()
      } else if (song.start === 0) {
        const stream = ytdl(song.url, { filter: 'audioonly' })
        this._streamDsipatcher = this._connection.play(stream)
      } else {
        this._streamDsipatcher = this._connection.play(
          await YTDownloader.stream({
            uri: song.url,
            offset: song.start,
          })
        )
      }
      this.blindtest?.createTimeout()
    }
  }

  private onMessage = (message: Message): void => {
    if (message.author.bot || message.partial || !message.member) return
    if (
      this.blindtest &&
      this.blindtest.isRunning &&
      this.blindtest.hasMemberJoined(message.member)
    ) {
      const result = this.blindtest.guessSong(message)
      if (result.foundTitle) {
        this.blindtest.nextSong()
      }
    }
  }

  private onEnd = (): void => {
    if (this._channel && this.blindtest) {
      this._channel.send('Blindtest terminé, merci les kheys, voici les points')
      this._channel.send(this.blindtest.printScores())
      this.endBlindtest()
    }
  }

  private onArtistFound = (
    artist: string,
    player: Player,
    message: Message
  ): void => {
    message.channel.send(
      `(+1pts) pour ${player.displayName} pour avoir ` +
        `trouvé l'artiste, qui était "${artist}".`
    )
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
          `trouvé le nom de la musique en moins de 3s (t'es un bot c'est pas possible), qui était "${title}". On passe à la suivante`
      )
    } else if (bonus === 1) {
      message.channel.send(
        `(+${bonus + POINTS_PER_TITLE}pts) pour ${
          player.displayName
        } pour avoir ` +
          `trouvé le nom de la musique en moins de 6s, qui était "${title}". On passe à la suivante`
      )
    } else {
      message.channel.send(
        `(+1pts) pour ${player.displayName}, qui ` +
          `a trouvé le nom de la musique, qui était "${title}". On passe à la suivante`
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

  private onMaxDurationExceeded = (currentSong: Song): void => {
    if (this._channel) {
      this._channel.send(
        `Le délai maximum a été atteint et personne n'a trouvé :'(. La musique était "${currentSong.title}", par "${currentSong.artist}"`
      )
    }
  }

  private initListeners(): void {
    if (this.blindtest) {
      this.blindtest.on('end', this.onEnd)
      this.blindtest.on('new-owner-request', this.onNewOwnerRequest)
      this.blindtest.on('no-player', this.endBlindtest)
      this.blindtest.on('max-duration-exceeded', this.onMaxDurationExceeded)
      this.blindtest.on('on-song-changed', this.onSongChanged)
      this.blindtest.on('on-artist-found', this.onArtistFound)
      this.blindtest.on('on-title-found', this.onTitleFound)
      this.bot.client.on('message', this.onMessage)
    }
  }

  private removeListeners(): void {
    if (this.blindtest) {
      this.blindtest.removeAllListeners()
    }
  }
}
