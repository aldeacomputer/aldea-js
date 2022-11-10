import { Jig, RemoteJig } from "./jig";

// @ts-ignore
@external("vm", "vm_local_lock")
declare function vm_local_lock<T>(jig: T, type: LockType, args: ArrayBuffer): void;
// @ts-ignore
@external("vm", "vm_remote_lock")
declare function vm_remote_lock(origin: ArrayBuffer, type: LockType, args: ArrayBuffer): void;

/**
 * TODO
 */
export enum LockType {
  DESTROYED = -1,   // -1 - destroyed
  NONE,             // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY_HASH,      // 1 - vm requires valid signature to call function or change lock
  PARENT,           // 2 - vm requires parent is caller to call function or change lock
  ANYONE,           // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
}

/**
 * TODO
 */
export declare class LockState {
  type: LockType;
  data: ArrayBuffer; // data is either pubkey, origin or empty buf
}

/**
 * TODO
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
      vm_remote_lock(this._jig.origin, type, data)
    } else {
      vm_local_lock(this._jig, type, data)
    }

    this.type = type
    this.data = data
  }

  toAddress(address: string): void {
    // TODO
  }

  toPubkeyHash(pubkeyHash: ArrayBuffer): void {
    if (pubkeyHash.byteLength != 20) {
      throw new Error('invalid lock data. pubkeyHash must be 20 bytes')
    }

    this.to(LockType.PUBKEY_HASH, pubkeyHash)
  }

  toParent(): void {
    this.to(LockType.PARENT)
  }

  toAnyone(): void {
    this.to(LockType.ANYONE)
  }
}
