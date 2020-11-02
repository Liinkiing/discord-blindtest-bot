import { BaseManager } from '~/managers/manager'
import { Blindtest } from '~/entities/blindtest'
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

  public createBlindtest(owner: Player, channel: Channel): void {
    this.blindtest = new Blindtest().setOwner(owner)
    this._channel = channel
    this.initListeners()
    Logger.success(`Created blindtest with owner ${owner.toString()}`)
  }

  public async startBlindtest(message: Message) {
    if (this.blindtest && message.member?.voice.channel) {
      message.channel.send('@everyone' + ' le blindtest va commencer!')
      this._connection = await message.member.voice.channel.join()
      this.blindtest.start()
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
      if (song.start === 0) {
        this._streamDsipatcher = this._connection.play(
          ytdl(song.url, { filter: 'audioonly' })
        )
      } else {
        this._streamDsipatcher = this._connection.play(
          await YTDownloader.stream({
            uri: song.url,
            offset: song.start,
          })
        )
      }
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
      `(+1pts) pour ${player.displayName}, qui ` +
        `a trouvé l'artiste, qui était ${artist}.`
    )
  }

  private onTitleFound = (
    title: string,
    player: Player,
    message: Message
  ): void => {
    message.channel.send(
      `(+1pts) pour ${player.displayName}, qui ` +
        `a trouvé le nom de la musique, qui était ${title}. On passe à la suivante`
    )
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
        `Le délai maximum a été atteint et personne n'a trouvé :'(. La musique était "${currentSong.title}, par "${currentSong.artist}"`
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
