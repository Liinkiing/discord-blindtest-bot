import events from 'events'
import { shuffle } from 'lodash'
import {
  makeObservable,
  observable,
  action,
  autorun,
  reaction,
  computed,
} from 'mobx'
import { Player } from '~/entities/player'
import { GuildMember, Message } from 'discord.js'
import { DiscordUserID } from '~/@types'
import { Logger } from '~/services/logger'
import { Song } from '~/entities/song'
import allSongs from '~/data/songs.json'

const MAX_DURATION = 20 * 1000
const POINTS_PER_ARTIST = 1
const POINTS_PER_TITLE = 1

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
      },
      { fireImmediately: false }
    )
  }

  public start(): void {
    this.state = State.Running
    this.createTimeout()
    this.initQueue()
  }

  private createTimeout(): void {
    this.timeout = setInterval(() => {
      if (this.currentSong) {
        this.emit('max-duration-exceeded', this.currentSong)
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
  public initQueue(): void {
    this.queue = shuffle(allSongs.map(song => new Song(song)))
    this.queue.forEach(song => {
      const users = new Map<DiscordUserID, FoundType>()
      this.players.forEach(player => {
        users.set(player.id, { foundArtist: false, foundTitle: false })
      })
      this._results.set(song.url, users)
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
            player.addPoints(POINTS_PER_TITLE)
            this.emit('on-title-found', this.currentSong.title, player, message)
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
}

type EventsMap = {
  'no-player': () => void
  'new-owner-request': (newOwner: Player) => void
  'max-duration-exceeded': (currentSong: Song) => void
  'on-artist-found': (artist: string, player: Player, message: Message) => void
  'on-title-found': (title: string, player: Player, message: Message) => void
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
