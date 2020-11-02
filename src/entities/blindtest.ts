import events from 'events'
import { shuffle } from 'lodash'
import {
  makeObservable,
  observable,
  action,
  autorun,
  reaction,
  computed,
  runInAction,
} from 'mobx'
import { Player } from '~/entities/player'
import { GuildMember, Message } from 'discord.js'
import { DiscordUserID } from '~/@types'
import { Logger } from '~/services/logger'
import { Song } from '~/entities/song'
import AirtableApiClient from '~/services/airtable-api'
import { SongMapper } from '~/mappers/song'

export const MAX_DURATION = 20 * 1000
export const POINTS_PER_ARTIST = 1
export const POINTS_PER_TITLE = 1

export type Bonus = 0 | 1 | 3

enum State {
  Pending,
  Running,
}

type FoundType = {
  foundArtist: boolean
  foundTitle: boolean
}

type YouTubeURL = string

export class Blindtest extends events.EventEmitter {
  @observable public state: State = State.Pending
  @observable public owner!: Player
  @observable public players: Player[] = []
  @observable public queue: Song[] = []

  private _timestamp = Date.now()
  private _results: Map<YouTubeURL, Map<DiscordUserID, FoundType>> = new Map()

  timeout: NodeJS.Timeout | null = null

  constructor() {
    super()
    makeObservable(this)
    autorun(() => {
      if (this.players.length === 0) {
        Logger.info('No more players in the blindtest. Deleting it')
        this.emit('no-player')
      }
    })
    reaction(
      () => this.queue,
      queue => {
        if (this.timeout) {
          clearInterval(this.timeout)
        }
        if (queue.length > 0) {
          this.emit('on-song-changed', queue[0])
          this.createTimeout()
        } else {
          Logger.info('No more songs.')
          this.emit('end')
        }
      }
    )
  }

  public async start(): Promise<void> {
    await this.initQueue()
    this.state = State.Running
    this.createTimeout()
  }

  private createTimeout(): void {
    this._timestamp = Date.now()
    const oldCurrentSong = this.currentSong
    this.timeout = setInterval(() => {
      if (oldCurrentSong && oldCurrentSong === this.currentSong) {
        this.emit('max-duration-exceeded', oldCurrentSong)
        this.nextSong()
      }
    }, MAX_DURATION)
  }

  @computed
  get isRunning(): boolean {
    return this.state === State.Running
  }

  @computed
  get currentSong(): Song | null {
    return this.queue.length > 0 ? this.queue[0] : null
  }

  @action
  public async initQueue(): Promise<void> {
    const records = await AirtableApiClient.songs().select().all()
    runInAction(() => {
      this.queue = shuffle(records.map(SongMapper.fromApi))
      this.queue.forEach(song => {
        const users = new Map<DiscordUserID, FoundType>()
        this.players.forEach(player => {
          users.set(player.id, { foundArtist: false, foundTitle: false })
        })
        this._results.set(song.url, users)
      })
    })
  }

  @action
  public nextSong(): void {
    const [, ...items] = this.queue
    this.queue = [...items]
  }

  @action
  public addPlayer(player: Player): this {
    this.players.push(player)

    return this
  }

  @action
  public removePlayer(member: GuildMember): this {
    this.players = this.players.filter(p => p.id !== member.id)

    if (this.owner.id === member.id) {
      if (this.players.length > 0) {
        Logger.info(
          'Owner left the blindtest that had other people in. Reassign it to another player'
        )
        this.emit('new-owner-request', this.players[0])
      }
    }

    return this
  }

  @action
  public setOwner(player: Player): this {
    this.owner = player
    if (!this.players.find(p => p.id === player.id)) {
      this.addPlayer(this.owner)
    }

    return this
  }

  public guessSong(message: Message): FoundType {
    const player = this.players.find(p => p.id === message.author.id)
    if (!player || !this.currentSong)
      return { foundArtist: false, foundTitle: false }
    if (this.currentSong && !message.author.bot && !message.partial) {
      if (
        message.content
          .toLowerCase()
          .includes(this.currentSong.artist.toLowerCase())
      ) {
        if (
          this._results.has(this.currentSong.url) &&
          this._results.get(this.currentSong.url)!.has(player.id)
        ) {
          // Nobody have found the artist yet
          if (
            Array.from(this._results.get(this.currentSong.url)!.values()).every(
              r => !r.foundArtist
            )
          ) {
            player.addPoints(POINTS_PER_ARTIST)
            this.emit(
              'on-artist-found',
              this.currentSong.artist,
              player,
              message
            )
          }
          this._results
            .get(this.currentSong.url)!
            .get(player.id)!.foundArtist = true
        }
      }
      if (
        message.content
          .toLowerCase()
          .includes(this.currentSong.title.toLowerCase())
      ) {
        if (
          this._results.has(this.currentSong.url) &&
          this._results.get(this.currentSong.url)!.has(player.id)
        ) {
          // Nobody have found the title yet
          if (
            Array.from(this._results.get(this.currentSong.url)!.values()).every(
              r => !r.foundTitle
            )
          ) {
            const bonusPoints = this.computeBonusPoint(
              Date.now() - this._timestamp
            )
            player.addPoints(POINTS_PER_TITLE + bonusPoints)
            this.emit(
              'on-title-found',
              this.currentSong.title,
              player,
              message,
              bonusPoints
            )
          }
          this._results
            .get(this.currentSong.url)!
            .get(player.id)!.foundTitle = true
        }
      }

      return this._results.get(this.currentSong.url)!.get(player.id)!
    }

    return { foundArtist: false, foundTitle: false }
  }

  public printScores(): string {
    return this.players
      .sort((a, b) => b.points - a.points)
      .map(
        p => `
${p.displayName} : ${p.points} pts`
      )
      .join('')
  }

  public hasMemberJoined(member: GuildMember): boolean {
    return !!this.players.find(p => p.id === member.id)
  }

  private computeBonusPoint(diff: number): Bonus {
    if (diff < 3000) {
      return 3
    }
    if (diff < 6000) {
      return 1
    }

    return 0
  }
}

type EventsMap = {
  'no-player': () => void
  'new-owner-request': (newOwner: Player) => void
  'max-duration-exceeded': (currentSong: Song) => void
  'on-artist-found': (artist: string, player: Player, message: Message) => void
  'on-title-found': (
    title: string,
    player: Player,
    message: Message,
    bonus: Bonus
  ) => void
  'on-song-changed': (song: Song) => void
  end: () => void
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
