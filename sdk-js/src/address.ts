import { PubKey, isPubKey } from './pubkey.js';
import { bech32m } from './support/base.js'
import { blake3 } from './support/hash.js'

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
    if (!isPubKey(pubKey)) {
      throw Error('The first argument to `Address.fromPubKey()` must be a `PubKey`')
    }
    const hash = blake3(pubKey.toBytes(), 20)
    return new Address(hash)
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
}

/**
 * Checks the given argument is an Address.
 */
export function isAddress(address: Address): boolean {
  return address instanceof Address
}