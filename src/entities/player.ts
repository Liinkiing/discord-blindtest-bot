import chalk from 'chalk'
import { DiscordUserID } from '~/@types'
import { GuildMember } from 'discord.js'
import { action, makeObservable, observable } from 'mobx'

export class Player {
  public id: DiscordUserID
  public displayName: string
  @observable public points = 0

  constructor(member: GuildMember) {
    this.id = member.id
    this.displayName = member.displayName
    makeObservable(this)
  }

  @action
  public addPoints(points: number): this {
    this.points += points

    return this
  }

  public toString(): string {
    return `${chalk.yellow(this.displayName)}(${chalk.gray(this.id)})`
  }
}
