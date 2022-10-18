import { AldeaCrypto } from './aldea-crypto.js'
import { PrivKey, PubKey } from '@aldea/sdk-js';

export class Signature {
  pubkey: PubKey;
  private rawsig: Uint8Array;

  constructor (pubkey: PubKey, rawsig: Uint8Array) {
    this.pubkey = pubkey
    this.rawsig = rawsig
  }

  verifyAgainst(data: Uint8Array) {
    return AldeaCrypto.verify(this.rawsig, data, this.pubkey)
  }

  static from(privKey: PrivKey, data: Buffer) {
    return new this(
      privKey.toPubKey(),
      AldeaCrypto.sign(Buffer.from(data), privKey)
    )
  }
}
