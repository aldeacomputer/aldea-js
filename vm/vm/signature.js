import { AldeaCrypto } from "./aldea-crypto.js"

export class Signature {
  constructor (pubkey, rawsig) {
    this.pubkey = pubkey
    this.rawsig = rawsig
  }

  verifyAgainst(data) {
    return AldeaCrypto.verify(this.rawsig, data, this.pubkey)
  }

  static from(privKey, data) {
    return new this(
      AldeaCrypto.publicKeyFromPrivateKey(privKey),
      AldeaCrypto.sign(Buffer.from(data), privKey)
    )
  }
}
