import { BaseManager } from '~/managers/manager'
import { Blindtest } from '~/entities/blindtest'
import { Logger } from '~/services/logger'
import { Player } from '~/entities/player'
import { Bot } from '~/bot'
import { Song } from '~/entities/song'
import { Message, StreamDispatcher, VoiceConnection } from 'discord.js'
import ytdl from 'ytdl-core'
import YTDownloader from '~/services/yt-downloader'

export class BlindtestManager extends BaseManager {
  public blindtest: Blindtest | null = null
  private _streamDsipatcher: StreamDispatcher | null = null
  private _connection: VoiceConnection | null = null

  constructor(protected bot: Bot) {
    super(bot)
  }

  public createBlindtest(owner: Player): void {
    this.blindtest = new Blindtest().setOwner(owner)
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
    console.log('CHANGING SONG TO ', song)
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
      message.reply('fdp c bien tu es dans le blindtest')
    }
  }

  private initListeners(): void {
    if (this.blindtest) {
      this.blindtest.on('no-player', this.endBlindtest)
      this.blindtest.on('on-song-changed', this.onSongChanged)
      this.bot.client.on('message', this.onMessage)
    }
  }

  private removeListeners(): void {
    if (this.blindtest) {
      this.blindtest.removeAllListeners()
    }
  }
}
