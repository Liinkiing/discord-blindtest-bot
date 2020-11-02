import Record from 'airtable/lib/record'
import { Song } from '~/entities/song'

export class SongMapper {
  public static fromApi = (record: Record): Song => {
    const [url, title, artist, start] = [
      record.get('URL'),
      record.get('Title'),
      record.get('Artist'),
      record.get('Start'),
    ]

    return new Song({
      url,
      title,
      artist,
      start,
    })
  }
}
