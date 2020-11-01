import { BaseManager } from '~/managers/manager'
import { Blindtest } from '~/entities/blindtest'
import { Logger } from '~/services/logger'
import { Player } from '~/entities/player'

export class BlindtestManager extends BaseManager {
  public blindtest: Blindtest | null = null

  public createBlindtest(owner: Player): void {
    this.blindtest = new Blindtest().setOwner(owner)
    this.blindtest.on('no-player', this.endBlindtest.bind(this))
    Logger.success(`Created blindtest with owner ${owner.toString()}`)
  }

  public endBlindtest(): void {
    this.blindtest = null
    Logger.success('Deleted blindtest')
  }
}
