import { vm_local_lock, vm_remote_lock } from './imports'
import { Jig, RemoteJig } from './jig'

/**
 * Lock Types
 * 
 * - Frozen   - can't be called; can't be locked; (can be loaded?)
 * - None     - can't be called; anyone can lock; (default type)
 * - Address  - requires sig to call; requires sig to lock;
 * - Jig      - caller must be parent; new lock must be set by parent;
 * - Public   - anyone can call; new lock must be set by self;
 */
export enum LockType {
  FROZEN = -1,
  NONE,
  ADDRESS,
  JIG,
  PUBLIC,
}

/**
 * Lock State struct
 * 
 * Data is either pubkey hash, origin, or empty bufer, depending on lock type.
 */
export declare class LockState {
  type: LockType;
  data: ArrayBuffer;
}

/**
 * Lock API
 * 
 * Never instantiated directly - only accessed via jig, eg: `jig.$lock`.
 */
export class Lock {
  private _jig: Jig;
  type: LockType = LockType.NONE;
  data: ArrayBuffer = new ArrayBuffer(0);

  constructor(jig: Jig, state: LockState | null = null) {
    this._jig = jig
    if (state) {
      this.type = state.type
      this.data = state.data
    }
  }

  to(type: LockType, data: ArrayBuffer = new ArrayBuffer(0)): void {
    if (this._jig instanceof RemoteJig) {
      const rjig = this._jig as RemoteJig
      vm_remote_lock(rjig.origin, type, data)
    } else {
      vm_local_lock(this._jig, type, data)
    }

    this.type = type
    this.data = data
  }

  toAddress(pubkeyHash: ArrayBuffer): void {
    if (pubkeyHash.byteLength != 20) {
      throw new Error('invalid lock data. pubkeyHash must be 20 bytes')
    }

    this.to(LockType.ADDRESS, pubkeyHash)
  }

  toCaller(): void {
    this.to(LockType.JIG)
  }

  toAnyone(): void {
    this.to(LockType.PUBLIC)
  }

  unlock (): void {
    this.to(LockType.NONE)
  }

  freeze(): void {
    this.to(LockType.FROZEN)
  }
}
