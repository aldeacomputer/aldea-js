import { PubKey } from './internal.js';
import { base16, bech32m } from './support/base.js'
import { hash } from './support/blake3.js'

const PREFIX = 'aldea:'

/**
 * Aldea address
 * 
 * An address is a 20 byte blake3 hash of a public key. It is encoded as a
 * string using Bech32m with the prefix `aldea:`.
 * 
 * Example:
 * 
 *     aldea:1w9er02jhjq5yxzuc9n6fjqqq8nhqpuhsxe2kfp
 */
export class Address {
  hash: Uint8Array;

  constructor(hash: Uint8Array) {
    this.hash = hash
  }

  /**
   * Returns an Address from the given PubKey.
   */
  static fromPubKey(pubKey: PubKey): Address {
    if (!(pubKey instanceof PubKey)) {
      throw Error('The first argument to `Address.fromPubKey()` must be a `PubKey`')
    }
    const pkh = hash(pubKey.toBytes(), 20)
    return new Address(pkh)
  }

  /**
   * Returns an Address from the encoded string.
   */
  static fromString(str: string): Address {
    const hash = bech32m.decode(str, PREFIX)
    return new Address(hash)
  }

  /**
   * Encodes the Address into a string.
   */
  toString(): string {
    return bech32m.encode(this.hash, PREFIX)
  }

  toHex(): string {
    return base16.encode(this.hash)
  }

  equals (other: Address): boolean {
    return this.hash.every((byte, i) => byte === other.hash[i])
  }
}
