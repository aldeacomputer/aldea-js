import {
  BufReader,
  BufWriter,
  Serializable,
} from './internal.js'

import { base16 } from './support/base.js'
import {buffEquals} from "./support/util.js";

const POINTER_STR_REGX = /^[a-f0-9]{64}_\d+$/i

/**
 * Aldea Pointer
 * 
 * A consists of a 32 byte ID and an index integer which points to the location
 * of an object within a larger data structure.
 * 
 * A Pointer is encoded as a string by concatentating the hex encoded ID with
 * the index.
 * 
 * Example:
 * 
 *     3b2af88dad7f1847f5b333852b71ac6fd2ae519ba2d359e8ce07b071aad30e80_1
 */
export class Pointer {
  idBuf: Uint8Array;
  idx: number;

  constructor(id: Uint8Array | string, idx: number) {
    this.idBuf = typeof id === 'string' ? base16.decode(id) : id
    this.idx = idx
  }

  static fromBytes(bytes: Uint8Array): Pointer {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `Pointer.fromBytes()` must be a `Uint8Array`')
    }
    const buf = new BufReader(bytes)
    return buf.read<Pointer>(PointerSerializer)
  }

  static fromString(str: string): Pointer {
    if (typeof str !== 'string' || !POINTER_STR_REGX.test(str)) {
      throw Error('invalid pointer. must be a pointer string.')
    }

    const [idStr, idxStr] = str.split('_')
    return new Pointer(base16.decode(idStr), Number(idxStr))
  }

  get id(): string {
    return base16.encode(this.idBuf)
  }

  equals(ptr: Pointer): boolean {
    return this.idx === ptr.idx && buffEquals(this.idBuf, ptr.idBuf)
  }

  toBytes(): Uint8Array {
    const buf = new BufWriter()
    buf.write<Pointer>(PointerSerializer, this)
    return buf.data
  }

  toString(): string {
    return `${ this.id }_${ this.idx }`
  }
}

/**
 * Pointer Serializer object - implements the Serializable interface.
 */
export const PointerSerializer: Serializable<Pointer> = {
  read(buf: BufReader): Pointer {
    const id = buf.readFixedBytes(32)
    const idx = buf.readU16()
    return new Pointer(id, idx)
  },

  write(buf: BufWriter, ptr: Pointer): BufWriter {
    buf.writeFixedBytes(ptr.idBuf)
    buf.writeU16(ptr.idx)
    return buf
  }
}
