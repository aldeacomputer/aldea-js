export {
  __vm_constructor_local,
  __vm_constructor_remote,
  __vm_call_method,
  __vm_call_function,
  __vm_get_prop,
} from './aldea/imports'

export { Jig, JigInitParams, __LocalJig, __ProxyJig } from './aldea/jig'
export { Coin, Fungible, __ProxyFungible } from './aldea/coin'
export { caller } from './aldea/caller'
export { __ArgWriter } from './aldea/arg-writer'

export { BigInt } from './vendor/big-int'

import { __vm_debug_str } from './aldea/imports'

export function debug(str: string): void {
  __vm_debug_str(str)
}
