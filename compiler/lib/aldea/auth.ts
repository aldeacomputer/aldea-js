import { ArgWriter } from "./arg-writer";

// @ts-ignore
@external("vm", "vm_local_authcheck")
declare function vm_local_authcheck<T>(jig: T, check: AuthCheck): bool;
// @ts-ignore
@external("vm", "vm_local_state")
declare function vm_local_state<T>(jig: T): UtxoState;
// @ts-ignore
@external("vm", "vm_local_lock")
declare function vm_local_lock<T>(jig: T, type: LockType, args: ArrayBuffer): void;
// @ts-ignore
@external("vm", "vm_remote_authcheck")
declare function vm_remote_authcheck(origin: ArrayBuffer, check: AuthCheck): bool;
// @ts-ignore
@external("vm", "vm_remote_state")
declare function vm_remote_state(origin: ArrayBuffer): UtxoState;
// @ts-ignore
@external("vm", "vm_remote_lock")
declare function vm_remote_lock(origin: ArrayBuffer, type: LockType, args: ArrayBuffer): void;

export enum AuthCheck {
  CALL,     // 0 - can the caller call a method?
  LOCK,     // 1 - can the called lock the jig?
}

export enum LockType {
  NONE,     // 0 - default, vm allows anyone to lock, but prevents function calls
  PUBKEY,   // 1 - vm requires valid signature to call function or change lock
  PARENT,   // 2 - vm requires parent is caller to call function or change lock
  ANYONE,   // 3 - can only be set in constructor, vm allows anyone to call function, but prevents lock change
}

export declare class LockState {
  type: LockType;
  data: ArrayBuffer; // data is either pubkey, origin or empty buf
}

export declare class UtxoState {
  origin: ArrayBuffer;
  location: ArrayBuffer;
  motos: u64;
  lock: LockState;
}

class JigOrProxy {
  origin!: ArrayBuffer;
}

// These are populated at compile time by jig class names
const EXPORTED_JIGS: string[] = [] 
const IMPORTED_JIGS: string[] = []
function isExported<T>(jig: T): bool {
  return EXPORTED_JIGS.includes(nameof(jig))
}
function isImported<T>(jig: T): bool {
  return IMPORTED_JIGS.includes(nameof(jig))
}

/**
 * Auth API
 */
export class Auth {
  static lockToNone<T extends JigOrProxy>(jig: T): void {
    lockTo(jig, LockType.NONE, new ArrayBuffer(0))
  }

  static lockToPubkey<T extends JigOrProxy>(jig: T, pubkey: ArrayBuffer): void {
    const args = new ArgWriter(4)
    args.writeU32(changetype<usize>(pubkey))
    lockTo(jig, LockType.PUBKEY, args.buffer)
  }

  static lockToParent<T extends JigOrProxy, P extends JigOrProxy>(jig: T, parent: P): void {
    const args = new ArgWriter(4)
    args.writeU32(changetype<usize>(originOf(parent)))
    lockTo(jig, LockType.PARENT, args.buffer)
  }

  static lockToAnyone<T extends JigOrProxy>(jig: T): void {
    lockTo(jig, LockType.ANYONE, new ArrayBuffer(0))
  }

  static authcheck<T extends JigOrProxy>(jig: T, check: AuthCheck): bool {
    if (isExported(jig)) {
      return vm_local_authcheck(jig, check)
    } else if (isDefined(jig.origin)) {
      return vm_remote_authcheck(jig.origin, check)
    } else {
      throw new Error('invalid object - must be jig')
    }
  }

  static getUtxoState<T extends JigOrProxy>(jig: T): UtxoState {
    if (isExported(jig)) {
      return vm_local_state(jig)
    } else if (isDefined(jig.origin)) {
      return vm_remote_state(jig.origin)
    } else {
      throw new Error('invalid object - must be jig')
    }
  }

  static getLockState<T extends JigOrProxy>(jig: T): LockState {
    const utxo = this.getUtxoState(jig)
    return utxo.lock
  }

  static getLockType<T extends JigOrProxy>(jig: T): LockType {
    const utxo = this.getUtxoState(jig)
    return utxo.lock.type
  }
}

function originOf<T extends JigOrProxy>(jig: T): ArrayBuffer {
  if (isExported(jig)) {
    const utxo = Auth.getUtxoState(jig)
    return utxo.origin
  } else if (isDefined(jig.origin)) {
    return jig.origin
  } else {
    throw 'invalid object - must be jig'
  }
}

function lockTo<T extends JigOrProxy>(jig: T, type: LockType, args: ArrayBuffer): void {
  if (isExported(jig)) {
    return vm_local_lock(jig, type, args)
  } else if (isDefined(jig.origin)) {
    return vm_remote_lock(jig.origin, type, args)
  } else {
    throw 'invalid object - must be jig'
  }
}
