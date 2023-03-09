import { ArgWriter } from './arg-writer'
import { _RemoteJig } from './jig'
import { vm_call_method, vm_get_prop } from './imports'

/**
 * Coin class
 * 
 * Built in Jig that proxies calls to the VM for handling.
 */
@final
export class Coin extends _RemoteJig {
  // @ts-ignore
  constructor() {
    throw new Error('coins cannot be instantiated from constructor')
  }

  get motos(): u64 {
    return vm_get_prop<u64>(
      this.$output.origin,
      'motos'
    )
  }

  send(motos: u64): Coin {
    const args = new ArgWriter(12)
    args.writeU64(motos)

    return vm_call_method<Coin>(
      this.$output.origin,
      'send',
      args.buffer
    )
  }

  combine(coins: Coin[]): Coin {
    const args = new ArgWriter(4)
    args.writeU32(changetype<usize>(coins))

    return vm_call_method<Coin>(
      this.$output.origin,
      'combine',
      args.buffer
    )
  }
}
