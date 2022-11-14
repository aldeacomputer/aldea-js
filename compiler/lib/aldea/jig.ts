import { Lock } from './lock'
import { getOutputState, Output } from './output'

const LOCK_CACHE = new Map<Jig, Lock>()
const OUTPUT_CACHE = new Map<Jig, Output>()

// Fetches state from the VM and caches the result
function cacheState(jig: Jig): void {
  const state = getOutputState(jig)
  LOCK_CACHE.set(jig, new Lock(jig, state.lock))
  OUTPUT_CACHE.set(jig, new Output(jig, state))
}

/**
 * Base Jig class
 */
export class Jig {
  get $lock(): Lock {
    if (!LOCK_CACHE.has(this)) { cacheState(this) }
    return LOCK_CACHE.get(this)
  }

  get $output(): Output {
    if (!OUTPUT_CACHE.has(this)) { cacheState(this) }
    return OUTPUT_CACHE.get(this)
  }
}

/**
 * Remote Jig class - never extended from directly
 */
export class RemoteJig extends Jig {
  origin: ArrayBuffer = new ArrayBuffer(0);
}
