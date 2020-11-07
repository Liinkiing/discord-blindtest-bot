import Record from 'airtable/lib/record'
import { Entry } from '~/entities/leaderboard/entry'

export class EntryMapper {
  public static fromApi = (record: Record): Entry => {
    const [recordId, userId, guildId, winCount, totalPoints] = [
      record.get('Record ID'),
      record.get('User ID'),
      record.get('Guild ID'),
      record.get('Win count'),
      record.get('Total points'),
    ]

    return new Entry({
      recordId,
      userId,
      guildId,
      winCount,
      totalPoints,
    })
  }
}
