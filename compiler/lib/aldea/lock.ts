import { vm_jig_lock } from './imports'

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
 * Lock API
 * 
 * Never instantiated directly - only accessed via jig, eg: `jig.$lock`.
 */
export class Lock {
  readonly origin: ArrayBuffer;
  type: LockType;
  data: ArrayBuffer;

  constructor(origin: ArrayBuffer, type: LockType, data: ArrayBuffer) {
    this.origin = origin
    this.type = type
    this.data = data
  }

  assertType(type: LockType): void {
    if (this.type !== type) {
      const expected = LockType[type]
      const actual = LockType[this.type]
      throw new Error(`expected lock type: ${expected}, was: ${actual}`)
    }
  }

  change(type: LockType, data: ArrayBuffer = new ArrayBuffer(0)): void {
    if (data.byteLength != 0 && data.byteLength != 20) {
      throw new Error('invalid lock data.')
    }

    vm_jig_lock(this.origin, type, data)
    this.type = type
    this.data = data
  }

  changeToAddressLock(pubkeyHash: ArrayBuffer): void {
    if (pubkeyHash.byteLength != 20) {
      throw new Error('invalid lock data. pubkeyHash must be 20 bytes')
    }

    this.change(LockType.ADDRESS, pubkeyHash)
  }

  changeToCallerLock(): void {
    this.change(LockType.JIG)
  }

  changeToAnyoneLock(): void {
    this.change(LockType.PUBLIC)
  }

  getAddressOrFail(): ArrayBuffer {
    this.assertType(LockType.ADDRESS)
    return this.data
  }

  getOriginOrFail(): ArrayBuffer {
    this.assertType(LockType.JIG)
    return this.data
  }

  unlock (): void {
    this.change(LockType.NONE)
  }

  freeze(): void {
    this.change(LockType.FROZEN)
  }
}
