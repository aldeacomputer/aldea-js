import {vm_local_state, vm_remote_state} from './imports'
import {Jig, RemoteJig} from './jig'
import {LockState, LockType} from './lock'

/**
 * Output State struct
 */
export declare class OutputState {
  origin: string;
  location: string;
  motos: u64;
  lock: LockState;
}

/**
 * Output API
 * 
 * Never instantiated directly - only accessed via jig, eg: `jig.$output`.
 */
export class Output {
  private _jig: Jig;
  origin: string;
  location: string;
  motos: u64;

  constructor(jig: Jig, state: OutputState) {
    this._jig = jig
    this.origin = state.origin
    this.location = state.location
    this.motos = state.motos
  }

  destroy(): void {
    this._jig.$lock.to(LockType.DESTROYED)
  }
}

/**
 * Fetches the output state from the VM for the given local or remote Jig.
 */
export function getOutputState(jig: Jig): OutputState {
  if (jig instanceof RemoteJig) {
    const rjig = jig as RemoteJig
    return vm_remote_state(rjig.origin)
  } else {
    return vm_local_state(jig)
  }
}
