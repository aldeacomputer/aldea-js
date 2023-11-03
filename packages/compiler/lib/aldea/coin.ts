import { __ArgWriter } from './arg-writer'
import { __ProxyJig } from './jig'
import { __vm_call_method, __vm_get_prop } from './imports'

export interface Fungible {
  amount: u64;
  send(amount: u64): Fungible;
  combine(tokens: Fungible[]): Fungible;
}

export class __ProxyFungible extends __ProxyJig implements Jig, Fungible {
  get amount(): u64 {
    return __vm_get_prop<u64>(
      this.$output.origin,
      'amount'
    )
  }

  send(amount: u64): Fungible {
    const args = new __ArgWriter(8)
    args.writeU64(amount)

    return __vm_call_method<Fungible>(
      this.$output.origin,
      'send',
      args.buffer
    )
  }

  combine(tokens: Fungible[]): Fungible {
    const args = new __ArgWriter(4)
    args.writeU32(changetype<usize>(tokens))

    return __vm_call_method<Fungible>(
      this.$output.origin,
      'combine',
      args.buffer
    )
  }
}

/**
 * Coin class
 * 
 * Built in Jig that proxies calls to the VM for handling.
 */
@final
export class Coin extends __ProxyJig implements Fungible {
  // @ts-ignore
  constructor() {
    throw new Error('coins cannot be instantiated from constructor')
  }

  get amount(): u64 {
    return __vm_get_prop<u64>(
      this.$output.origin,
      'amount'
    )
  }

  send(motos: u64): Coin {
    const args = new __ArgWriter(8)
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
