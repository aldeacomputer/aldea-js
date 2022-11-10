import { Jig, RemoteJig } from './jig'
import { LockState, LockType } from './lock'

// @ts-ignore
@external("vm", "vm_local_state")
declare function vm_local_state<T>(jig: T): OutputState;
// @ts-ignore
@external("vm", "vm_remote_state")
declare function vm_remote_state(origin: ArrayBuffer): OutputState;


export declare class OutputState {
  origin: string;
  location: string;
  motos: u64;
  lock: LockState;
}


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


export function getOutputState(jig: Jig): OutputState {
  if (jig instanceof RemoteJig) {
    return vm_remote_state(jig.origin)
  } else {
    return vm_local_state(jig)
  }
}
