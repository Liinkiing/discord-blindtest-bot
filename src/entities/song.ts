export interface ISong {
  url: string
  title: string
  artist?: string
  categories?: string[]
  start: number
}

export class Song implements ISong {
  public url: string
  public title: string
  public artist?: string
  public categories: string[] = []
  public start: number

  constructor({ url, title, artist, start, categories }: ISong) {
    this.url = url
    this.title = title
    this.artist = artist
    this.start = start
    if (categories) {
      this.categories = categories
    }
  }
}
