import { AldeaCrypto } from './aldea-crypto.js'

export class Signature {
  pubkey: Uint8Array;
  private rawsig: Uint8Array;

  constructor (pubkey: Uint8Array, rawsig: Uint8Array) {
    this.pubkey = pubkey
    this.rawsig = rawsig
  }

  verifyAgainst(data: Uint8Array) {
    return AldeaCrypto.verify(this.rawsig, data, this.pubkey)
  }

  static from(privKey: Uint8Array, data: Buffer) {
    return new this(
      AldeaCrypto.publicKeyFromPrivateKey(privKey),
      AldeaCrypto.sign(Buffer.from(data), privKey)
    )
  }
}
