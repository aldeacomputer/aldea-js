import { Aldea, Address, KeyPair } from '@aldea/sdk-js'

const aldea = new Aldea()
const keys = KeyPair.fromRandom()
const address = Address.fromPubKey(keys.pubKey)

const tx = aldea.createTx(tx => {
  tx.load('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  tx.call(0, 1, [500, address.hash])
  tx.fund(0)
  tx.sign(keys.privKey)
})

console.log(tx.toHex())
console.log(tx)
