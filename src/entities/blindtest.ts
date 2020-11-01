import events from 'events'
import { makeObservable, observable, action, autorun, reaction } from 'mobx'
import { Player } from '~/entities/player'
import { GuildMember } from 'discord.js'
import { DiscordUserID } from '~/@types'
import { Logger } from '~/services/logger'
import { Song } from '~/entities/song'
import allSongs from '~/data/songs.json'

const MAX_DURATION = 8 * 1000

export class Blindtest extends events.EventEmitter {
  @observable public owner!: Player
  @observable public players: Player[] = []
  @observable public queue: Song[] = []

  timeout: NodeJS.Timeout | null = null

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
    reaction(
      () => this.queue,
      queue => {
        if (queue.length > 0) {
          this.emit('on-song-changed', queue[0])
        } else {
          Logger.info('No more songs.')
          this.emit('no-more-songs')
          if (this.timeout) {
            clearInterval(this.timeout)
          }
        }
      }
    )
  }

  public start() {
    this.timeout = setInterval(() => {
      this.emit('max-duration-exceed')
      this.popQueue()
    }, MAX_DURATION)
    this.initQueue()
  }

  @action
  public initQueue(): void {
    this.queue = allSongs.map(song => new Song(song))
  }

  @action
  public popQueue(): void {
    const [, ...items] = this.queue
    this.queue = [...items]
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
  'max-duration-exceed': () => void
  'on-song-changed': (song: Song) => void
  'no-more-songs': () => void
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
