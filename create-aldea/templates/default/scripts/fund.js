import fs from 'fs'
import { join } from 'path'
import minimist from 'minimist'
import { bold } from 'kolorist'
import dotenv from 'dotenv'
import { Address, Aldea, KeyPair, PrivKey } from '@aldea/sdk-js'

/**
 * Uses the faucet to fund the project address with a coin.
 */
async function fund(cwd, _argv) {
  const keys = loadKeys(cwd)
  const address = Address.fromPubKey(keys.pubKey)
  
  const aldea = new Aldea('localhost', 4000)
  const params = { amount: 10000, address: address.toString() }
  const res = await aldea.api.post('mint', { json: params }).json()
  const coin = await aldea.loadOutput(res.id)

  console.log(`You've received ${ coin.props.amount } motos to your address!`)
  console.log()
  console.log('Raw output data:')
  console.log(res)
  console.log()
  console.log('Coin ID: (make a note of this)')
  console.log(bold(coin.id))
  console.log()
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
