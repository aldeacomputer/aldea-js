import fs from 'fs'
import { KeyPair, base16, ed25519 } from './../dist/index.js'

function vectorgen(i) {
  const keys = KeyPair.fromRandom()
  const msg = ed25519.randomBytes(i)
  const sig = ed25519.sign(msg, keys.privKey)
  return [
    keys.privKey.toHex(),
    keys.pubKey.toHex(),
    base16.encode(msg),
    base16.encode(sig),
  ].join(':')
}

const file = fs.createWriteStream('./vectors.txt', { flags: 'ax' })
file.write('PRIVKEY:PUBKEY:MSG:SIG\n')
for (let i = 0; i <= 1024; i++) {
  file.write(vectorgen(i) + '\n')
}
file.end()
