import { Client } from 'discord.js'
import { BaseCommand } from '~/commands/base-command'
import * as Commands from '~/commands'
import { Logger } from '~/services/logger'

export class Bot {
  private readonly _client: Client
  private _commands: BaseCommand[] = []

  get client(): Client {
    return this._client
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
    this.initCommands()

    return true
  }

  private initCommands(): void {
    Logger.info('Initializing commands')
    this._commands.push(
      ...[new Commands.PingCommand(this), new Commands.AudioCommand(this)]
    )
  }
}
