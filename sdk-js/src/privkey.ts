import { KeyPair, PubKey } from './internal.js';
import { base16 } from './support/base.js';
import { randomBytes } from './support/ed25519.js'

/**
 * Aldea private key
 * 
 * A private key is a 32 byte random key.
 */
export class PrivKey {
  d: Uint8Array;

  constructor(d: Uint8Array) {
    if (d.length !== 32) throw new Error('PrivKey must be 32 bytes')
    this.d = d
  }

  /**
   * Returns a PrivKey from the given bytes.
   */
  static fromBytes(bytes: Uint8Array): PrivKey {
    if (!ArrayBuffer.isView(bytes)) {
      throw Error('The first argument to `PrivKey.fromBytes()` must be a `Uint8Array`')
    }
    return new PrivKey(bytes)
  }

  /**
   * Returns a PrivKey from the given hex-encoded string.
   */
  static fromHex(str: string): PrivKey {
    if (typeof str !== 'string') {
      throw Error('The first argument to `PrivKey.fromHex()` must be a `string`')
    }
    const d = base16.decode(str)
    return new PrivKey(d)
  }

  /**
   * Generates and returns a new random PrivKey.
   */
  static fromRandom(): PrivKey {
    const d = randomBytes(32)
    return new PrivKey(d)
  }

  /**
   * Returns the PrivKey as bytes.
   */
  toBytes(): Uint8Array {
    return this.d
  }

  /**
   * Returns the PrivKey as hex-encoded string.
   */
  toHex(): string {
    return base16.encode(this.d)
  }

  /**
   * Returns a KeyPair from the PrivKey.
   */
  toKeyPair(): KeyPair {
    return KeyPair.fromPrivKey(this)
  }

  /**
   * Returns the PrivKey's corresponding PubKey.
   */
  toPubKey(): PubKey {
    return PubKey.fromPrivKey(this)
  }
}
