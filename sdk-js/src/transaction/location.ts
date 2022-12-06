export class Location {
  txid: ArrayBuffer
  index: number

  constructor(txid: ArrayBuffer, index: number) {
    this.txid = txid
    this.index = index
  }

  toString () {
    return `${Buffer.from(this.txid).toString('hex')}_o${this.index}`
  }

  toBuffer (): ArrayBuffer {
    const buf = Buffer.alloc(36)
    Buffer.from(this.txid).copy(buf, 0, 0, 32)
    buf.writeInt32LE(this.index, 32)
    return new Uint8Array(buf).buffer
  }

  toUintArray (): Uint8Array {
    const buf = Buffer.alloc(36)
    Buffer.from(this.txid).copy(buf, 0, 0, 32)
    buf.writeInt32LE(this.index, 32)
    return new Uint8Array(buf)
  }

  equals (another: Location) {
    return Buffer.from(this.txid).equals(Buffer.from(another.txid)) && this.index === another.index
  }

  static fromString (aString: string): Location {
    const [txid, index] = aString.split('_o')
    return new this(
      new Uint8Array(Buffer.from(txid, 'hex')),
      Number(index)
    )
  }

  static fromBuffer (aBuffer: ArrayBuffer): Location {
    const buffer = Buffer.from(aBuffer);
    const txid = new Uint8Array(buffer.subarray(0, 32))
    const index = buffer.readUint32LE(32)
    return new this(
      txid,
      index
    )
  }
}
