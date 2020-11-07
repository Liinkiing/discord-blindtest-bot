import { BaseManager } from '~/managers/manager'
import { Bot } from '~/bot'
import { Player } from '~/entities/player'
import AirtableApiClient from '~/services/airtable-api'
import { Entry } from '~/entities/leaderboard/entry'
import { EntryMapper } from '~/mappers/leaderboard/entry'
import { Blindtest } from '~/entities/blindtest'
import { Logger } from '~/services/logger'

export class LeaderboardManager extends BaseManager {
  constructor(protected bot: Bot) {
    super(bot)
  }
  public getName(): string {
    return 'LeaderboardManager'
  }

  public saveBlindtest = async (blindtest: Blindtest): Promise<void> => {
    Logger.info('Saving blindtest to leaderboard...')
    for (const p of blindtest.sortedPlayers) {
      let entry = await this.retrieveEntry({
        player: p,
        guildId: blindtest.guildId,
      })
      Logger.info(`Fetching leaderboard entry for ${p.toString()}...`)
      if (!entry) {
        Logger.info(
          `Could not fetch leaderboard entry. Creating a new entry for ${p.toString()}...`
        )
        entry = await this.createEntry({
          player: p,
          guildId: blindtest.guildId,
        })
        Logger.success(
          `Successfully created leaderboard entry for ${p.toString()}`
        )
      } else {
        Logger.info(
          `Successfully fetched leaderboard entry for ${p.toString()}. Updating it...`
        )
        entry = await this.bot.leaderboardManager.updateEntry({
          entry,
          player: p,
          isWinner: p.id === blindtest.winner?.id,
        })
      }
    }
    Logger.success('Successfully saved blindtest to leaderboard')
  }

  private retrieveEntry = async ({
    player,
    guildId,
  }: {
    player: Player
    guildId: string
  }): Promise<Entry | null> => {
    try {
      const records = await AirtableApiClient.leaderboard()
        .select({
          maxRecords: 1,
          filterByFormula: `ID = "${player.id} - ${guildId}"`,
        })
        .all()
      if (records.length === 0) {
        return null
      }
      return EntryMapper.fromApi(records[0])
    } catch (e: any) {
      console.error(e)
      return null
    }
  }

  private updateEntry = async ({
    entry,
    player,
    isWinner,
  }: {
    entry: Entry
    player: Player
    isWinner: boolean
  }): Promise<Entry> => {
    const record = await AirtableApiClient.leaderboard().update(
      entry.recordId,
      {
        'Win count': isWinner ? entry.winCount + 1 : entry.winCount,
        'Total points': entry.totalPoints + player.points,
      }
    )

    return EntryMapper.fromApi(record)
  }

  public createEntry = async ({
    player,
    guildId,
  }: {
    player: Player
    guildId: string
  }): Promise<Entry> => {
    const record = await AirtableApiClient.leaderboard().create({
      'User ID': player.id,
      'Guild ID': guildId,
      'Win count': 1,
      'Total points': player.points,
    })

    return EntryMapper.fromApi(record)
  }
}
