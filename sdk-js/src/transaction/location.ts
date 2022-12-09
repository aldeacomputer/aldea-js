import {base16} from "../support/base.js";
import {Digest} from "./digest.js";
import {Buffer} from "buffer";

export class Location {
  private buff: Uint8Array

  constructor( buff: Uint8Array) {
    this.buff = buff
  }

  toString () {
    return base16.encode(this.toBuffer())
  }

  toBuffer (): Uint8Array {
    return this.buff
  }

  toUintArray (): Uint8Array {
    return this.toBuffer()
  }

  equals (another: Location) {
    return Buffer.from(this.buff).equals(Buffer.from(another.buff))
  }

  static fromString (aString: string): Location {
    const buf = base16.decode(aString)

    return new this(
      buf
    )
  }

  static fromData (txid: Uint8Array, index: number): Location {
    const dig = new Digest()
      .addBuff(txid)
      .addNumber(index)
    return new this(dig.toBuffer())
  }

  static fromBuffer(buff: Uint8Array): Location {
    return new this(buff)
  }
}
