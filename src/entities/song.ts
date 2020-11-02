export interface ISong {
  url: string
  title: string
  artist?: string
  start: number
}

export class Song implements ISong {
  public url: string
  public title: string
  public artist?: string
  public start: number

  constructor({ url, title, artist, start }: ISong) {
    this.url = url
    this.title = title
    this.artist = artist
    this.start = start
  }
}
