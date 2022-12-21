import {
  PrivKey,
  PubKey,
} from './internal.js'

/**
 * Aldea keypair
 * 
 * Convinience wrapper around a PrivKey and PubKey pair.
 */
export class KeyPair {
  privKey: PrivKey;
  pubKey: PubKey;

  constructor(privKey: PrivKey, pubKey: PubKey) {
    this.privKey = privKey
    this.pubKey = pubKey
  }

  /**
   * Generates and returns a new random KeyPair.
   */
  static fromRandom(): KeyPair {
    const privKey = PrivKey.fromRandom()
    return KeyPair.fromPrivKey(privKey)
  }

  /**
   * Returns a KeyPair from the given PrivKey.
   */
  static fromPrivKey(privKey: PrivKey): KeyPair {
    if (!(privKey instanceof PrivKey)) {
      throw Error('The first argument to `KeyPair.fromPrivKey()` must be a `PrivKey`')
    }
    const pubKey = privKey.toPubKey()
    return new KeyPair(privKey, pubKey)
  }
}
