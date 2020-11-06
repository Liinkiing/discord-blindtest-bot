import events from 'events'
import { shuffle } from 'lodash'
import {
  action,
  autorun,
  computed,
  makeObservable,
  observable,
  reaction,
  runInAction,
} from 'mobx'
import { Player } from '~/entities/player'
import { GuildMember, Message } from 'discord.js'
import { Logger } from '~/services/logger'
import { Song } from '~/entities/song'
import AirtableApiClient from '~/services/airtable-api'
import { SongMapper } from '~/mappers/song'
import { normalize } from '~/utils/string'
import { wait } from '~/utils/promise'
import { t } from '~/translations'

export const MAX_DURATION = 20 * 1000
export const POINTS_PER_ARTIST = 1
export const POINTS_PER_TITLE = 1

export type Bonus = 0 | 1 | 3

export enum State {
  Pending = 'PENDING',
  Waiting = 'WAITING',
  Running = 'RUNNING',
}

type FoundType = {
  foundArtist: boolean
  foundTitle: boolean
}

type YouTubeURL = string

export type BlindtestOptions = {
  limit: number
  categories: string[]
  skipArtists?: boolean
}

export const PAUSE_DURATION = 5000

export const computeBonusSentence = (bonus: Bonus): string => {
  switch (bonus) {
    case 0:
      return ''
    case 1:
      return t('blindtest.bonus.fast')
    case 3:
      return t('blindtest.bonus.sonic')
  }
}

export class Blindtest extends events.EventEmitter {
  @observable public state: State = State.Pending
  @observable public owner!: Player
  @observable public voteSkips: Player[] = []
  @observable public players: Player[] = []
  @observable public queue: Song[] = []

  private readonly _limit: number = 0
  private readonly _skipArtists: boolean = false
  private readonly _categories: string[] = []
  private _timestamp = Date.now()
  private _results: Map<YouTubeURL, FoundType> = new Map()

  timeout: NodeJS.Timeout | null = null

  constructor(options: BlindtestOptions = { limit: 0, categories: [] }) {
    super()
    this._limit = options.limit
    this._categories = options.categories
    this._skipArtists = options.skipArtists ?? false
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
        } else {
          Logger.info('No more songs.')
          this.emit('end')
        }
      }
    )
    reaction(
      () => this.voteSkips,
      voteSkips => {
        if (voteSkips.length > 0) {
          const voter = [...voteSkips].pop()
          if (!voter) return
          Logger.info(
            `${voter.toString()} wants to skip this song (${voteSkips.length}/${
              this.majorityVotesCount
            })`
          )
          if (this.isRunning) {
            this.emit('on-skip-vote', voter)
            if (
              voteSkips.length >= this.majorityVotesCount &&
              this.currentSong
            ) {
              Logger.info(
                `The majority of players has decided to skip the song "${this.currentSong.title}". Skipping it...`
              )
              this.changeState(State.Waiting)
              this.emit('on-song-skipped', this.currentSong)
            }
          }
        }
      }
    )
  }

  @computed
  get majorityVotesCount(): number {
    return Math.floor(this.players.length / 2 + 1)
  }

  public async start(): Promise<void> {
    await this.initQueue()
    this.changeState(State.Running)
  }

  @computed
  get isRunning(): boolean {
    return this.state === State.Running
  }

  @computed
  get currentSong(): Song | null {
    return this.queue.length > 0 ? this.queue[0] : null
  }

  public createTimeout(): void {
    this._timestamp = Date.now()
    const oldCurrentSong = this.currentSong
    this.timeout = setInterval(() => {
      if (
        this.isRunning &&
        oldCurrentSong &&
        oldCurrentSong === this.currentSong
      ) {
        this.changeState(State.Waiting)
        this.emit('max-duration-exceeded', oldCurrentSong)
      }
    }, MAX_DURATION)
  }

  @action
  public async initQueue(): Promise<void> {
    const records = await AirtableApiClient.songs().select().all()
    runInAction(() => {
      let songs = shuffle(records.map(SongMapper.fromApi))
      if (this._categories.length > 0) {
        songs = songs.filter(s =>
          s.genres.some(c =>
            this._categories.map(normalize).includes(normalize(c))
          )
        )
      }
      this.queue = songs.slice(0, this._limit > 0 ? this._limit : songs.length)
      this.queue.forEach(song => {
        this._results.set(song.url, { foundTitle: false, foundArtist: false })
      })
    })
  }

  @computed
  get hasNextSong(): boolean {
    return this.queue.length > 1
  }

  @action
  public nextSong(): void {
    this.clearVotesSkip()
    const [, ...items] = this.queue
    this.queue = [...items]
    this.changeState(State.Running)
  }

  @action
  public addPlayer(player: Player): this {
    if (!this.players.find(p => p.id === player.id)) {
      this.players = [...this.players, player]
    }

    return this
  }

  @action
  public addVoteSkip(player: Player): this {
    if (!this.voteSkips.find(p => p.id === player.id)) {
      this.voteSkips = [...this.voteSkips, player]
    }

    return this
  }

  @action
  public clearVotesSkip(): this {
    this.voteSkips = []

    return this
  }

  @action public wait(ms: number): Promise<unknown> {
    this.changeState(State.Waiting)

    return wait(ms)
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
  private changeState = (state: State): this => {
    this.state = state

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
      if (this.currentSong.artists.length === 0 || this._skipArtists) {
        this._results.get(this.currentSong.url)!.foundArtist = true
      }
      if (
        this.currentSong.artists.length > 0 &&
        this.currentSong.artists
          .map(normalize)
          .some(artist => normalize(message.content).includes(artist))
      ) {
        if (
          this._results.has(this.currentSong.url) &&
          !this._results.get(this.currentSong.url)!.foundArtist
        ) {
          // Nobody have found the artist yet
          const bonusPoints = this.computeBonusPoint(
            Date.now() - this._timestamp
          )
          player.addPoints(POINTS_PER_ARTIST + bonusPoints)
          this.emit(
            'on-artists-found',
            this.currentSong.artists,
            player,
            message,
            bonusPoints
          )

          this._results.get(this.currentSong.url)!.foundArtist = true
        }
      }
      if (
        normalize(message.content).includes(normalize(this.currentSong.title))
      ) {
        if (
          this._results.has(this.currentSong.url) &&
          !this._results.get(this.currentSong.url)!.foundTitle
        ) {
          // Nobody have found the title yet
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

          this._results.get(this.currentSong.url)!.foundTitle = true
        }
      }

      return this._results.get(this.currentSong.url)!
    }

    return { foundArtist: false, foundTitle: false }
  }

  @computed
  get scores(): string {
    function getMedal(position: number) {
      switch (position) {
        case 0:
          return '🥇 '
        case 1:
          return '🥈 '
        case 2:
          return '🥉 '
        default:
          return ''
      }
    }
    return [...this.players]
      .sort((a, b) => b.points - a.points)
      .map(
        (p, i) => `
${getMedal(i)}${p.displayName} : ${p.points} pts`
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
  'on-skip-vote': (voter: Player) => void
  'on-song-skipped': (currentSong: Song) => void
  'new-owner-request': (newOwner: Player) => void
  'max-duration-exceeded': (currentSong: Song) => void
  'on-artists-found': (
    artists: string[],
    player: Player,
    message: Message,
    bonus: Bonus
  ) => void
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
