import chalk from 'chalk'
import { Blindtest } from '~/entities/blindtest'
import { DiscordUserID } from '~/@types'
import { GuildMember } from 'discord.js'

export class Player {
  public id: DiscordUserID
  public displayName: string
  public points = 0
  public blindtest: Blindtest | null = null

  constructor(member: GuildMember) {
    this.id = member.id
    this.displayName = member.displayName
  }

  public toString(): string {
    return `${chalk.yellow(this.displayName)}(${chalk.gray(this.id)})`
  }
}
