import * as ed from "@noble/ed25519"
import { createHash } from "crypto"
import {PubKey, ed25519, PrivKey} from "@aldea/sdk-js";

ed.utils.sha512Sync = (...m) => {
  const hash = createHash('sha512')
  hash.update(ed.utils.concatBytes(...m))
  return hash.digest()
};

export const AldeaCrypto = {
  randomPrivateKey: (): PrivKey => PrivKey.fromRandom(),
  publicKeyFromPrivateKey: (privKey: PrivKey ): PubKey => privKey.toPubKey(),
  sign: (message: Buffer, privKey: PrivKey): Uint8Array => ed25519.sign(message, privKey),
  verify: (sig: Uint8Array, message: Uint8Array, pubKey: PubKey) => ed25519.verify(sig, message, pubKey)
}
