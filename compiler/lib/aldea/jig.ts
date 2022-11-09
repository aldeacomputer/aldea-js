import { Lock } from './lock'
import { getOutputState, Output } from './output'

/**
 * TODO
 */
export class Jig {
  private _lock: Lock = new Lock(this);
  private _output: Output | null = null;

  get $lock(): Lock {
    if (!this._lock) {
      const state = getOutputState(this)
      this._lock = new Lock(this, state.lock)
    }

    return this._lock
  }

  get $output(): Output {
    if (!this._output) {
      const state = getOutputState(this)
      this._output = new Output(this, state)
    }

    return this._output
  }
}

/**
 * TODO
 */
export class RemoteJig extends Jig {
  origin: ArrayBuffer = new ArrayBuffer(0);
}
