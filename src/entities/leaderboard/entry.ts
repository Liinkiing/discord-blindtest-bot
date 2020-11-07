export interface IEntry {
  recordId: string
  userId: string
  guildId: string
  winCount: number
  totalPoints: number
}

export class Entry implements IEntry {
  public recordId: string
  public userId: string
  public guildId: string
  public winCount: number
  public totalPoints: number

  constructor({ recordId, guildId, userId, winCount, totalPoints }: IEntry) {
    this.recordId = recordId
    this.userId = userId
    this.guildId = guildId
    this.winCount = winCount
    this.totalPoints = totalPoints
  }
}
