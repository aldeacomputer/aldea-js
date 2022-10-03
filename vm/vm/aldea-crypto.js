import * as ed from "@noble/ed25519"
import { createHash } from "crypto"

ed.utils.sha512Sync = (...m) => {
  const hash = createHash('sha512')
  hash.update(ed.utils.concatBytes(...m))
  return hash.digest()
};

export const AldeaCrypto = {
  randomPrivateKey: () => ed.utils.randomPrivateKey(),
  publicKeyFromPrivateKey: (privKey) => ed.sync.getPublicKey(privKey),
  sign: (message, privKey) => ed.sync.sign(message, privKey),
  verify: (sig, message, pubKey) => ed.sync.verify(sig, message, pubKey)
}
