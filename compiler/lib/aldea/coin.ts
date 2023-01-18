import { ArgWriter } from './arg-writer'
import { Jig, RemoteJig } from './jig'
import { vm_remote_call_i, vm_remote_prop } from './imports'

/**
 * Coin class
 * 
 * Built in Jig that proxies calls to the VM for handling.
 */
@final
export class Coin extends RemoteJig {
  // @ts-ignore
  constructor() {
    throw new Error('coins cannot be instantiated from constructor')
  }

  get motos(): u64 {
    return vm_remote_prop<u64>(
      this.$output.origin,
      'Coin.motos'
    )
  }

  send(motos: u64, to: ArrayBuffer): Coin {
    const args = new ArgWriter(12)
    args.writeU64(motos)
    args.writeU32(changetype<usize>(to))

    return vm_remote_call_i<Coin>(
      this.$output.origin,
      'Coin$send',
      args.buffer
    )
  }

  combine(coins: Coin[]): Coin {
    const args = new ArgWriter(4)
    args.writeU32(changetype<usize>(coins))

    return vm_remote_call_i<Coin>(
      this.$output.origin,
      'Coin$combine',
      args.buffer
    )
  }
}
