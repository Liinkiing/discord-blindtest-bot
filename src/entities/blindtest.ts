import events from 'events'
import { makeObservable, observable, action, autorun } from 'mobx'
import { Player } from '~/entities/player'
import { GuildMember } from 'discord.js'
import { DiscordUserID } from '~/@types'
import { Logger } from '~/services/logger'

export class Blindtest extends events.EventEmitter {
  @observable public owner!: Player
  @observable public players: Player[] = []

  constructor() {
    super()
    makeObservable(this)
    autorun(() => {
      if (this.players.length === 0) {
        Logger.info('No more players in the blindtest. Deleting it')
        this.emit('no-player')
      } else {
        Logger.info('A player joined the blindtest')
      }
    })
  }

  @action
  public addPlayer(player: Player): this {
    this.players.push(player)

    return this
  }

  @action
  public removePlayer(id: DiscordUserID): this {
    this.players = this.players.filter(p => p.id !== id)

    return this
  }

  @action
  public setOwner(player: Player): this {
    this.owner = player
    this.addPlayer(this.owner)

    return this
  }

  public hasMemberJoined(member: GuildMember): boolean {
    return !!this.players.find(p => p.id === member.id)
  }
}

type EventsMap = {
  'no-player': () => void
}

export declare interface Blindtest {
  on<E extends keyof EventsMap>(event: E, listener: EventsMap[E]): this

  once<E extends keyof EventsMap>(event: E, listener: EventsMap[E]): this

  addListener<E extends keyof EventsMap>(event: E, listener: EventsMap[E]): this

  emit<E extends keyof EventsMap>(
    event: E,
    ...args: Parameters<EventsMap[E]>
  ): boolean

  off<E extends keyof EventsMap>(event: E, listener: EventsMap[E]): this
}
