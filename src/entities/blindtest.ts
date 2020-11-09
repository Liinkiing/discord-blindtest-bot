import events from 'events'
import _ from 'lodash'
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
import { getMedal, normalize } from '~/utils/string'
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
  artists: string[]
  skipArtists?: boolean
  showScoreAfterEachSong?: boolean
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

  public readonly guildId: string
  public readonly showScoreAfterEachSong: boolean = true

  private readonly _limit: number = 0
  private readonly _skipArtists: boolean = false
  private readonly _categories: string[] = []
  private readonly _artists: string[] = []
  private _timestamp = Date.now()
  private _results: Map<YouTubeURL, FoundType> = new Map()
  private _timeout: NodeJS.Timeout | number | null = null

  constructor(
    options: BlindtestOptions = { limit: 0, categories: [], artists: [] },
    guildId: string
  ) {
    super()
    makeObservable(this)
    this.guildId = guildId
    this._limit = options.limit
    this._categories = options.categories
    this._artists = options.artists
    this.showScoreAfterEachSong = options.showScoreAfterEachSong ?? true
    this._skipArtists = options.skipArtists ?? false
    autorun(() => {
      if (this.players.length === 0) {
        Logger.info('No more players in the blindtest. Deleting it')
        this.emit('no-player', this)
      }
    })
    reaction(
      () => this.queue,
      queue => {
        if (this._timeout) {
          clearInterval(this._timeout as number)
        }
        if (queue.length > 0) {
          this.emit('on-song-changed', queue[0], this)
        } else {
          Logger.info('No more songs.')
          this.emit('end', this)
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
            this.emit('on-skip-vote', voter, this)
            if (
              voteSkips.length >= this.majorityVotesCount &&
              this.currentSong
            ) {
              Logger.info(
                `All players has decided to skip the song "${this.currentSong.title}". Skipping it...`
              )
              this.changeState(State.Waiting)
              this.emit('on-song-skipped', this.currentSong, this)
            }
          }
        }
      }
    )
  }

  @computed
  get majorityVotesCount(): number {
    return this.players.length
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
  get isWaiting(): boolean {
    return this.state === State.Waiting
  }

  @computed
  get currentSong(): Song | null {
    return this.queue.length > 0 ? this.queue[0] : null
  }

  public createTimeout(): void {
    this._timestamp = Date.now()
    const oldCurrentSong = this.currentSong
    this._timeout = setInterval(() => {
      if (
        this.isRunning &&
        oldCurrentSong &&
        oldCurrentSong === this.currentSong
      ) {
        this.changeState(State.Waiting)
        this.emit('max-duration-exceeded', oldCurrentSong, this)
      }
    }, MAX_DURATION)
  }

  @action
  public async initQueue(): Promise<void> {
    const records = await AirtableApiClient.songs().select().all()
    runInAction(() => {
      let songs = _.shuffle(records.map(SongMapper.fromApi))
      if (this._categories.length > 0) {
        songs = songs.filter(s =>
          s.genres.some(c =>
            this._categories.map(c => normalize(c)).includes(normalize(c))
          )
        )
      }
      if (this._artists.length > 0) {
        songs = songs.filter(s =>
          s.artists.some(a =>
            this._artists.map(a => normalize(a)).includes(normalize(a))
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
        this.emit('new-owner-request', this.players[0], this)
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
      this.guessArtist(message, player)
      this.guessTitle(message, player)

      const result = this._results.get(this.currentSong.url)!
      if (result.foundArtist && result.foundTitle) {
        this.changeState(State.Waiting)
      }
      return result
    }

    return { foundArtist: false, foundTitle: false }
  }

  private guessTitle(message: Message, player: Player): void {
    if (!this.currentSong) return
    const content = normalize(message.content)
    const title = normalize(this.currentSong.title, { split: true })
    if (content.includes(title)) {
      if (
        this._results.has(this.currentSong.url) &&
        !this._results.get(this.currentSong.url)!.foundTitle
      ) {
        // Nobody have found the title yet
        const bonusPoints = this.computeBonusPoint(Date.now() - this._timestamp)
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
  }

  private guessArtist(message: Message, player: Player): void {
    if (!this.currentSong) return
    const content = normalize(message.content)
    const artists =
      this.currentSong.artists.length > 0
        ? this.currentSong.artists.map(a => normalize(a))
        : []
    if (this.currentSong.artists.length === 0 || this._skipArtists) {
      this._results.get(this.currentSong.url)!.foundArtist = true
    }
    if (
      artists.length > 0 &&
      artists.some(artist => content.includes(artist))
    ) {
      if (
        this._results.has(this.currentSong.url) &&
        !this._results.get(this.currentSong.url)!.foundArtist
      ) {
        // Nobody have found the artist yet
        const bonusPoints = this.computeBonusPoint(Date.now() - this._timestamp)
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
  }

  @computed
  get sortedPlayers(): Player[] {
    return [...this.players].sort((a, b) => b.points - a.points)
  }

  @computed
  get winner(): Player | null {
    if (this.sortedPlayers.length <= 1) return null
    if (this.sortedPlayers.reduce((acc, val) => acc + val.points, 0) <= 0)
      return null
    return this.sortedPlayers[0]
  }

  @computed
  get scores(): string {
    return this.sortedPlayers
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
  'no-player': (blindtest: Blindtest) => void
  'on-skip-vote': (voter: Player, blindtest: Blindtest) => void
  'on-song-skipped': (currentSong: Song, blindtest: Blindtest) => void
  'new-owner-request': (newOwner: Player, blindtest: Blindtest) => void
  'max-duration-exceeded': (currentSong: Song, blindtest: Blindtest) => void
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
  'on-song-changed': (song: Song, blindtest: Blindtest) => void
  end: (blindtest: Blindtest) => void
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
