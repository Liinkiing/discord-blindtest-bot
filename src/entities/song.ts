export interface ISong {
  url: string
  title: string
  artists: string[]
  genres: string[]
  link: string
  album?: string
  picture?: string
}

export class Song implements ISong {
  public url: string
  public title: string
  public artists: string[] = []
  public genres: string[] = []
  public link: string
  public album?: string
  public picture?: string

  constructor({ url, title, artists, album, link, picture, genres }: ISong) {
    this.url = url
    this.title = title
    this.artists = artists
    this.genres = genres
    this.album = album
    this.link = link
    this.picture = picture
  }
}
