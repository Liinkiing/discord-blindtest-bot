import ffpmegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
import ytdl from 'ytdl-core'
import { Logger } from '~/services/logger'
import * as fs from 'fs'
import { Readable } from 'stream'

interface DownloadParams {
  uri: string
  offset?: number
}

const PATH = '/tmp/sound.ogg'

class YTDownloaderApp {
  constructor(options: { ffmpeg: { path: string; version: string } }) {
    ffmpeg.setFfmpegPath(options.ffmpeg.path)
  }

  public stream = async ({
    uri,
    offset,
  }: DownloadParams): Promise<Readable> => {
    const audio = ytdl(uri, { filter: 'audioonly' })
    return new Promise((resolve, reject) => {
      ffmpeg(audio)
        .on('progress', progress => {
          Logger.info(`Processed ${progress.timemark}`)
        })
        .on('start', () => {
          Logger.info(`Processing ${uri}`)
        })
        .on('end', () => {
          resolve(fs.createReadStream(PATH))
        })
        .on('error', e => {
          reject(e.message)
        })
        .setStartTime(offset ?? 0)
        .save(PATH)
    })
  }
}

const YTDownloader = new YTDownloaderApp({
  ffmpeg: {
    path: ffpmegInstaller.path,
    version: ffpmegInstaller.version,
  },
})

export default YTDownloader
