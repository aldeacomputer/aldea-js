import minimist from 'minimist'
import { bold } from 'kolorist'
import { Aldea, TxBuilder } from '@aldea/sdk-js'
import { buildPackage, loadKeys } from './_helpers.js'

/**
 * Bundles the list of files and creates a deploy transaction.
 */
async function deploy(cwd, argv) {
  if (!argv.coin) {
    throw new Error('cannot fund transaction. please specify funding coin with --coin argument.')
  }

  const kp = loadKeys(cwd)
  const pkg = buildPackage(cwd, argv._)
  // const address = Address.fromPubKey(keys.pubKey)
  const aldea = new Aldea('https://node.aldea.computer')
  const wallet = new wallet.Wallet(new LowDbStorage(cwd + '/.aldea-wallet'), aldea, kp)

  const txBuilder = new TxBuilder(aldea)
  txBuilder.deploy(pkg)

  const res = await wallet.fundSignAndBroadcastTx(txBuilder).catch(async e => {
    console.error(await e.response.text())
    process.exit()
  })

  console.log('The package has been succesfully deployed!')
  console.log()
  console.log('Raw transaction data:')
  console.log(res)
  console.log()
  console.log('Coin ID: (change)')
  console.log(bold(res.outputs[1].id))
  console.log()
  console.log('Package ID:')
  console.log(bold(res.packages[0].id))
  console.log()
}

deploy(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
