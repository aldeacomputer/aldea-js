import fs from 'fs'
import { join } from 'path'
import minimist from 'minimist'
import dotenv from 'dotenv'
import { Address, Aldea, KeyPair, PrivKey } from '@aldea/sdk-js'

/**
 * Uses the fauce to fund the project address with a coin.
 */
async function fund(cwd, argv) {
  const keys = loadKeys(cwd)
  const address = Address.fromPubKey(keys.pubKey)
  
  const aldea = new Aldea()
  const params = { amount: 10000, address: address.toString() }
  const res = await aldea.api.post('mint', { json: params }).json()

  console.log('make a note of the coin jig_ref')
  console.log(res)
}

// Loads keys from file
function loadKeys(cwd) {
  const filename = '.aldea'
  const keysFile = join(cwd, filename)

  try {
    const data = fs.readFileSync(keysFile)
    const keys = dotenv.parse(data)
    const privKey = PrivKey.fromHex(keys.PRIVKEY)
    return KeyPair.fromPrivKey(privKey)
  } catch(e) {
    throw new Error(`file ${filename} does not exists or is invalid. invoke keygen command first.`)
  }
}

fund(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
