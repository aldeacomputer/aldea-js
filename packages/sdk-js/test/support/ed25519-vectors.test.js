import test from 'ava'
import fs from 'fs'
import {
  base16,
  ed25519,
  PrivKey,
  PubKey
} from '../../dist/index.js'

const file = fs.readFileSync('./test/vectors/ed25519-b3.txt')
const vectors = file.toString().trim().split('\n').map(line => line.split(':'))

for (let i in vectors) {
  if (i > 0) {
    const [privKeyHex, expectedPubKey, msgHex, expectedSig] = vectors[i]
    test(`Ed25519-B3 vector passes, length: ${msgHex.length / 2}`, t => {
      const privKey = PrivKey.fromHex(privKeyHex)
      const pubKey = PubKey.fromPrivKey(privKey)
      const msg = base16.decode(msgHex)
      const sig = ed25519.sign(msg, privKey)
      t.is(pubKey.toHex(), expectedPubKey)
      t.is(base16.encode(sig), expectedSig)
      t.true(ed25519.verify(sig, msg, pubKey))
    })
  }
}
