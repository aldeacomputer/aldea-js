import * as ed from "@noble/ed25519"
import { createHash } from "crypto"

ed.utils.sha512Sync = (...m) => {
  const hash = createHash('sha512')
  hash.update(ed.utils.concatBytes(...m))
  return hash.digest()
};

export const AldeaCrypto = {
  randomPrivateKey: () => ed.utils.randomPrivateKey(),
  publicKeyFromPrivateKey: (privKey: Uint8Array ) => ed.sync.getPublicKey(privKey),
  sign: (message: Buffer, privKey: Uint8Array): Uint8Array => ed.sync.sign(message, privKey),
  verify: (sig: Uint8Array, message: Uint8Array, pubKey: Uint8Array) => ed.sync.verify(sig, message, pubKey)
}
