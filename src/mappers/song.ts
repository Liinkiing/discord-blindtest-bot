import Record from 'airtable/lib/record'
import { Song } from '~/entities/song'

export class SongMapper {
  public static fromApi = (record: Record): Song => {
    const [url, title, artists, genres, album, picture, link] = [
      record.get('Preview URL'),
      record.get('Title'),
      record.get('Artists') ?? [],
      record.get('Genres') ?? [],
      record.get('Album'),
      record.get('Picture'),
      record.get('Link'),
    ]

    return new Song({
      url,
      title,
      artists,
      genres,
      album,
      picture,
      link,
    })
  }
}
