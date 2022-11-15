import { vm_local_lock, vm_remote_lock } from './imports'
import { fromBech32m } from './bytes'
import { Jig, RemoteJig } from './jig'

/**
 * Lock Types
 * 
 * - Destroyed  - can't be called; can't be locked; (can be loaded?)
 * - None       - can't be called; anyone can lock; (default type)
 * - PubkeyHash - requires sig to call; requires sig to lock;
 * - Caller     - caller must be parent; new lock must be set by parent;
 * - Anyone     - anyone can call; can't be locked; (must be set in own constructor)
 */
export enum LockType {
  DESTROYED = -1,
  NONE,
  PUBKEY_HASH,
  CALLER,
  ANYONE,
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
  
  toAddress(address: string): void {
    const pubkeyHash = fromBech32m(address, 'aldea:')
    return this.toPubkeyHash(pubkeyHash)
  }

  toPubkeyHash(pubkeyHash: ArrayBuffer): void {
    if (pubkeyHash.byteLength != 20) {
      throw new Error('invalid lock data. pubkeyHash must be 20 bytes')
    }

    this.to(LockType.PUBKEY_HASH, pubkeyHash)
  }

  toCaller(): void {
    this.to(LockType.CALLER)
  }

  toAnyone(): void {
    this.to(LockType.ANYONE)
  }

  unlock (): void {
    this.to(LockType.NONE)
  }
}
