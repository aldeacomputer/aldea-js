import { ArgWriter } from './arg-writer'
import { RemoteJig } from './jig'
import { vm_remote_call_i } from './imports'

/**
 * Coin class
 * 
 * Built in RemoteJig that proxies calls to the VM for handling.
 */
@final
export class Coin extends RemoteJig {
  constructor() {
    super()
    throw new Error('coins cannot be instantiated from constructor')
  }

  send(motos: u64, to: ArrayBuffer): Coin {
    const args = new ArgWriter(12)
    args.writeU64(motos)
    args.writeU32(changetype<usize>(to))

    return vm_remote_call_i<Coin>(
      this.origin,
      'Coin$send',
      args.buffer
    )
  }

  combine(coins: Coin[]): Coin {
    const args = new ArgWriter(4)
    args.writeU32(changetype<usize>(coins))

    return vm_remote_call_i<Coin>(
      this.origin,
      'Coin$combine',
      args.buffer
    )
  }
}
