import { BaseCommand, Command } from '~/commands/base-command'
import YTDownloader from '~/services/yt-downloader'
import ytdl from 'ytdl-core'
import { Logger } from '~/services/logger'

const UNKNOWN_VIDEO_MESSAGE = 'BAKBAAAAAA! Donne moi une URL valide stp frérot'
const NO_VOCAL_CHANNEL = 'BAKAAAAA! Tu dois être dans un channel vocal frérot'
const YOUTUBE_REGEX = new RegExp(
  '((^(http(s)?:\\/\\/)?((w){3}.)?(music.)?youtube.com?\\/watch\\?v=.+)|(^(http(s)?:\\/\\/)?((w){3}.)?youtu.be?\\/.+))'
)

export class AudioCommand extends BaseCommand {
  _name = 'audio'

  public async execute({ args, message }: Command): Promise<void> {
    if (!message.guild) return
    const [uri, offset] = args
    if (uri === 'stop' && message.member?.voice.channel) {
      message.guild.voice?.channel?.leave()
      return
    }
    if (!uri || !uri.match(YOUTUBE_REGEX)) {
      message.reply(UNKNOWN_VIDEO_MESSAGE)
      return
    }
    if (message.member?.voice.channel) {
      try {
        const connection = await message.member.voice.channel.join()
        if (!offset) {
          connection.play(ytdl(args[0], { filter: 'audioonly' }))
        } else {
          connection.play(
            await YTDownloader.stream({
              uri,
              offset: Number(offset ?? 0),
            })
          )
        }
      } catch (e) {
        Logger.error(e)
        message.guild.voice?.channel?.leave()
        message.reply(UNKNOWN_VIDEO_MESSAGE)
        return
      }
    } else {
      message.reply(NO_VOCAL_CHANNEL)
      return
    }
  }
}
