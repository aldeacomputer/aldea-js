import {
  BufReader,
  BufWriter,
  Serializable,
} from './internal.js'
import { base16 } from './support/base.js'

/**
 * Lock Types
 * 
 * - Frozen     - can't be called; can't be locked; (can be loaded?)
 * - None       - anyone can call; anyone can lock; (default type)
 * - Address    - requires sig to call; requires sig to lock;
 * - Caller     - caller must be parent; new lock must be set by parent;
 * - Anyone     - anyone can call; can't be locked; (must be set in own constructor)
 */
export enum LockType {
  FROZEN = -1,
  NONE,
  ADDRESS,
  JIG,
  PUBLIC,
}

/**
 * Raw Lock interface
 */
export interface LockInterface {
  type: number;
  data: string;
}

/**
 * Output Lock
 * 
 * Every output has a Lock which determines who can call methods and update the
 * instance.
 */
export class Lock {
  type: LockType;
  data: Uint8Array;

  constructor(type: LockType, data: Uint8Array) {
    this.type = type
    this.data = data
  }

  static fromBytes(bytes: Uint8Array): Lock {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `Lock.fromBytes()` must be a `Uint8Array`')
    }
    const buf = new BufReader(bytes)
    return buf.read<Lock>(LockSerializer)
  }

  static fromJson(json: LockInterface): Lock {
    return new Lock(json.type, base16.decode(json.data))
  }

  toBytes(): Uint8Array {
    const buf = new BufWriter()
    buf.write<Lock>(LockSerializer, this)
    return buf.data
  }

  toHex(): string {
    return base16.encode(this.toBytes())
  }

  toJson(): LockInterface {
    return { type: this.type, data: base16.encode(this.data) }
  }
}

/**
 * Lock Serializer object - implements the Serializable interface.
 */
export const LockSerializer: Serializable<Lock> = {
  read(buf: BufReader): Lock {
    const type = buf.readU8()
    let data
    if (type === LockType.ADDRESS) {
      data = buf.readFixedBytes(20)
    } else
    if (type == LockType.JIG) {
      data = buf.readFixedBytes(34)
    } else {
      data = buf.readFixedBytes(0)
    }
    return new Lock(type, data)
  },

  write(buf: BufWriter, lock: Lock): BufWriter {
    buf.writeU8(lock.type)
    buf.writeFixedBytes(lock.data)
    return buf
  }
}
