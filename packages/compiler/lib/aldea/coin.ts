import { __ArgWriter } from './arg-writer'
import { __ProxyJig } from './jig'
import { __vm_call_method, __vm_get_prop } from './imports'

/**
 * Coin class
 * 
 * Built in Jig that proxies calls to the VM for handling.
 */
@final
export class Coin extends __ProxyJig {
  // @ts-ignore
  constructor() {
    throw new Error('coins cannot be instantiated from constructor')
  }

  get motos(): u64 {
    return __vm_get_prop<u64>(
      this.$output.origin,
      'motos'
    )
  }

  send(motos: u64): Coin {
    const args = new __ArgWriter(12)
    args.writeU64(motos)

    return __vm_call_method<Coin>(
      this.$output.origin,
      'send',
      args.buffer
    )
  }

  combine(coins: Coin[]): Coin {
    const args = new __ArgWriter(4)
    args.writeU32(changetype<usize>(coins))

    return __vm_call_method<Coin>(
      this.$output.origin,
      'combine',
      args.buffer
    )
  }
}
