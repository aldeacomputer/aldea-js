import { Address, PrivKey, isPrivKey } from './internal.js'
import { base16 } from './support/base.js'
import { Point, calcPoint, pointFromBytes, pointToBytes } from './support/ed25519.js'

/**
 * Aldea public key
 * 
 * A public key is the X and Y coordinates of a point on  Ed25519 curve. It is
 * serialized as the 32 byte Y coordinate, with the last byte encoding the sign
 * of X. 
 */
export class PubKey {
  point: Point;

  constructor(point: Point) {
    this.point = point
  }

  /**
   * checks if 2 pubkey objects represent the same point
   */
  equals (another: PubKey) {
    return this.x === another.x && this.y === another.y
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
    const point = pointFromBytes(str)
    return new PubKey(point)
  }

  /**
   * Returns a the giveb PrivKey's corresponding PubKey.
   */
  static fromPrivKey(privKey: PrivKey): PubKey {
    if (!isPrivKey(privKey)) {
      throw Error('The first argument to `PubKey.fromPrivKey()` must be a `PrivKey`')
    }
    const point = calcPoint(privKey.d)
    return new PubKey(point)
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
}

/**
 * Checks the given argument is a PubKey.
 */
export function isPubKey(pubKey: any): boolean {
  return pubKey instanceof PubKey
}
