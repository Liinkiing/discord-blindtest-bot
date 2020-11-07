import Airtable from 'airtable'
import Table from 'airtable/lib/table'

type Params = {
  apiKey: string
  baseId: string
}

class AirtableApiClientApp {
  private client: Airtable
  private baseId: string
  constructor({ apiKey, baseId }: Params) {
    this.client = new Airtable({ apiKey: apiKey })
    this.baseId = baseId
  }

  public songs(): Table {
    return this.client
      .base(this.baseId)
      .table(process.env.AIRTABLE_SONGS_TABLE_NAME ?? 'songs')
  }

  public leaderboard(): Table {
    return this.client
      .base(this.baseId)
      .table(process.env.AIRTABLE_LEADERBOARD_TABLE_NAME ?? 'leaderboard')
  }
}

const AirtableApiClient = new AirtableApiClientApp({
  apiKey: process.env.AIRTABLE_API_KEY!,
  baseId: process.env.AIRTABLE_BASE_ID!,
})

export default AirtableApiClient
