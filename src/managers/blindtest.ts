import { BaseManager } from '~/managers/manager'
import { Blindtest } from '~/entities/blindtest'
import { Logger } from '~/services/logger'
import { Player } from '~/entities/player'
import { Bot } from '~/bot'
import { Song } from '~/entities/song'
import { Message, VoiceConnection } from 'discord.js'
import ytdl from 'ytdl-core'
import YTDownloader from '~/services/yt-downloader'

export class BlindtestManager extends BaseManager {
  public blindtest: Blindtest | null = null
  private connection: VoiceConnection | null = null

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
      this.blindtest.start()
      this.connection = await message.member.voice.channel.join()
    } else {
      message.channel.send(
        'Wsh mon reuf, tu dois être dans un vocal pour lancer un blindtest'
      )
    }
  }

  public endBlindtest = (): void => {
    this.removeListeners()
    this.blindtest = null
    Logger.success('Deleted blindtest')
  }

  private onSongChanged = async (song: Song) => {
    console.log('CHANGING SONG TO ', song)
    if (this.connection) {
      if (song.start === 0) {
        this.connection.play(ytdl(song.url, { filter: 'audioonly' }))
      } else {
        this.connection.play(
          await YTDownloader.stream({
            uri: song.url,
            offset: song.start,
          })
        )
      }
    }
  }

  private initListeners(): void {
    if (this.blindtest) {
      this.blindtest.on('no-player', this.endBlindtest)
      this.blindtest.on('on-song-changed', this.onSongChanged)
    }
  }

  private removeListeners(): void {
    if (this.blindtest) {
      this.blindtest.removeAllListeners('no-player')
    }
  }
}
