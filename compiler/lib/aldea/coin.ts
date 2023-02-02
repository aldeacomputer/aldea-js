import { ArgWriter } from './arg-writer'
import { RemoteJig } from './jig'
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
      'motos'
    )
  }

  send(motos: u64): Coin {
    const args = new ArgWriter(12)
    args.writeU64(motos)

    return vm_remote_call_i<Coin>(
      this.$output.origin,
      'send',
      args.buffer
    )
  }

  combine(coins: Coin[]): Coin {
    const args = new ArgWriter(4)
    args.writeU32(changetype<usize>(coins))

    return vm_remote_call_i<Coin>(
      this.$output.origin,
      'combine',
      args.buffer
    )
  }
}
