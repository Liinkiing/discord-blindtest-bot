import { Client } from 'discord.js'
import { BaseCommand } from '~/commands/base-command'
import { PingCommand } from '~/commands/ping'

export class Bot {
  private readonly _client: Client
  private _commands: BaseCommand[] = []

  get client(): Client {
    return this._client
  }

  get name(): string {
    return this._client.user ? this._client.user.username : ''
  }

  constructor() {
    this._client = new Client()
  }

  public async login(token: string): Promise<boolean> {
    await this._client.login(token)
    this.initCommands()

    return true
  }

  private initCommands(): void {
    this._commands.push(...[new PingCommand(this)])
  }
}
