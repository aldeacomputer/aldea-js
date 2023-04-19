import minimist from 'minimist'
import { bold } from 'kolorist'
import { Address, Aldea } from '@aldea/sdk-js'
import { loadKeys } from './_helpers.js'

/**
 * Uses the faucet to fund the project address with a coin.
 */
async function fund(cwd, _argv) {
  const keys = loadKeys(cwd)
  const address = Address.fromPubKey(keys.pubKey)
  
  const aldea = new Aldea('https://node.aldea.computer')
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

fund(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
