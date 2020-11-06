import { Client } from 'discord.js'
import { BaseCommand } from '~/commands/base-command'
import * as Commands from '~/commands'
import * as Managers from '~/managers'
import { BlindtestManager } from '~/managers'
import { Logger } from '~/services/logger'
import { BaseManager } from '~/managers/manager'

const DEFAULT_ACTIVITY = '!bt help'

export class Bot {
  private readonly _client: Client
  private _commands: BaseCommand[] = []
  private _managers: BaseManager[] = []

  get client(): Client {
    return this._client
  }

  get blindtestManager(): BlindtestManager {
    return this._managers.find(
      manager => manager instanceof BlindtestManager
    ) as BlindtestManager
  }

  get commands(): BaseCommand[] {
    return this._commands
  }

  get name(): string {
    return this._client.user ? this._client.user.username : ''
  }

  constructor() {
    this._client = new Client()
  }

  public async login(token: string): Promise<boolean> {
    await this._client.login(token)
    Logger.success(`Logged in as ${this.name}`)
    this._client.user?.setActivity(DEFAULT_ACTIVITY, { type: 'LISTENING' })
    this.initCommands()
    this.initManagers()

    return true
  }

  private initCommands(): void {
    Logger.info('Initializing commands')
    this._commands.push(...[new Commands.BlindtestCommand(this)])
  }

  private initManagers(): void {
    Logger.info('Initializing managers')
    this._managers.push(...[new Managers.BlindtestManager(this)])
  }
}
