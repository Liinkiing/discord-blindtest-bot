import chalk from 'chalk'
import { Blindtest } from '~/entities/blindtest'
import { DiscordUserID } from '~/@types'

export class Player {
  public id: DiscordUserID
  public displayName: string
  public blindtest: Blindtest | null = null

  constructor({ id, displayName }: { id: string; displayName: string }) {
    this.id = id
    this.displayName = displayName
  }

  public toString(): string {
    return `${chalk.yellow(this.displayName)}(${chalk.gray(this.id)})`
  }
}
