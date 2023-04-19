import minimist from 'minimist'
import { bold } from 'kolorist'
import { Address, Aldea } from '@aldea/sdk-js'
import { buildPackage, loadKeys } from './_helpers.js'

/**
 * Bundles the list of files and creates a deploy transaction.
 */
async function deploy(cwd, argv) {
  if (!argv.coin) {
    throw new Error('cannot fund transaction. please specify funding coin with --coin argument.')
  }

  const keys = loadKeys(cwd)
  const pkg = buildPackage(cwd, argv._)
  const address = Address.fromPubKey(keys.pubKey)

  const aldea = new Aldea('https://node.aldea.computer')
  const coin = await aldea.loadOutput(argv.coin)

  if (coin.props.amount < 100) {
    throw Error('insufficient balance to fund transaction:', coin.props)
  }

  // Build the deploy transaction
  const tx = await aldea.createTx(tx => {
    const coinRef = tx.load(coin.id)
    tx.deploy(pkg)
    tx.call(coinRef, 'send', [coin.props.motos - 100, address.hash])
    tx.fund(coinRef)
    tx.sign(keys.privKey)
  })

  const res = await aldea.commitTx(tx).catch(async e => {
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
