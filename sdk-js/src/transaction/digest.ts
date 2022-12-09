import {BufWriter} from "../buf-writer.js";
import {blake3} from "../support/hash.js";
import {base16} from "../support/base.js";

export class Digest {
  private buffs: Uint8Array[]

  constructor (buffs: Uint8Array[] = []) {
    this.buffs = buffs
  }

  addBuff (buff: Uint8Array): Digest {
    this.buffs.push(buff)
    return this
  }

  addNumber (aNumber: number): Digest {
    const buf = new Uint32Array(1)
    buf.set([aNumber], 0)
    this.buffs.push(new Uint8Array(buf.buffer))
    return this
  }

  toBuffer (): Uint8Array {
    const ret = new BufWriter()

    for (const buff of this.buffs) {
      ret.writeU32(buff.byteLength)
      ret.writeBytes(buff)
    }

    return blake3(ret.data)
  }

  toString(): string {
    const buf = this.toBuffer()
    return base16.encode(buf)
  }
}
