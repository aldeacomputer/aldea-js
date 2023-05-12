import { Address, PrivKey } from './internal.js'
import { base16, bech32m } from './support/base.js'
import { Point, calcPoint, pointFromBytes, pointToBytes } from './support/ed25519.js'

const PREFIX = 'apub'

/**
 * Aldea public key
 * 
 * A public key is the X and Y coordinates of a point on  Ed25519 curve. It is
 * serialized as the 32 byte Y coordinate, with the last byte encoding the sign
 * of X. 
 */
export class PubKey {
  readonly point: Point;

  constructor(point: Point) {
    this.point = point
  }

  /**
   * Returns a PubKey from the given bytes.
   */
  static fromBytes(bytes: Uint8Array): PubKey {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `PubKey.fromBytes()` must be a `Uint8Array`')
    }
    const point = pointFromBytes(bytes)
    return new PubKey(point)
  }

  /**
   * Returns a PubKey from the given hex-encoded string.
   */
  static fromHex(str: string): PubKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `PubKey.fromHex()` must be a `string`')
    }
    const bytes = base16.decode(str)
    return PubKey.fromBytes(bytes)
  }

  /**
   * Returns a PubKey from the given bech32m-encoded string.
   */
  static fromString(str: string): PubKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `PubKey.fromString()` must be a `string`')
    }
    const bytes = bech32m.decode(str, PREFIX)
    return PubKey.fromBytes(bytes)
  }


  /**
   * Returns a the giveb PrivKey's corresponding PubKey.
   */
  static fromPrivKey(privKey: PrivKey): PubKey {
    if (!(privKey instanceof PrivKey)) {
      throw Error('The first argument to `PubKey.fromPrivKey()` must be a `PrivKey`')
    }
    const point = calcPoint(privKey.toBytes())
    return new PubKey(point)
  }

  /**
   * Point X coordiante
   */
  get x(): bigint { return this.point.x }

  /**
   * Point Y coordiante
   */
  get y(): bigint { return this.point.y }

  /**
   * checks if 2 pubkey objects represent the same point
   */
  equals (another: PubKey) {
    return this.x === another.x && this.y === another.y
  }

  /**
   * Returns the PubKey's Address.
   */
  toAddress(): Address {
    return Address.fromPubKey(this)
  }

  /**
   * Returns the PubKey as bytes.
   */
  toBytes(): Uint8Array {
    return pointToBytes(this.point)
  }

  /**
   * Returns the PubKey as hex-encoded string.
   */
  toHex(): string {
    return base16.encode(this.toBytes())
  }

  /**
   * Returns the PubKey as bech32m-encoded string.
   */
  toString(): string {
    return bech32m.encode(this.toBytes(), PREFIX)
  }
}
