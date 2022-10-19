import { PrivKey, PubKey } from './index.js';
import {sign, verify} from "./support/ed25519.js";

export class Signature {
  pubKey: PubKey;
  rawSig: Uint8Array;

  constructor (pubkey: PubKey, rawsig: Uint8Array) {
    this.pubKey = pubkey
    this.rawSig = rawsig
  }

  verifyAgainst(data: Uint8Array) {
    return verify(this.rawSig, data, this.pubKey)
  }

  static from(privKey: PrivKey, data: Buffer) {
    return new this(
      privKey.toPubKey(),
      sign(Buffer.from(data), privKey)
    )
  }
}
