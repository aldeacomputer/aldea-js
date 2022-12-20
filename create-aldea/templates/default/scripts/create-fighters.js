import minimist from 'minimist'
import { bold } from 'kolorist'
import { Address, Aldea } from '@aldea/sdk-js'
import { loadKeys } from './_helpers.js'

/**
 * Creates two fighter instances and equips one with a weapon
 */
async function createFighters(cwd, argv) {
  if (!argv.coin) {
    throw new Error('cannot fund transaction. please specify funding coin with --coin argument.')
  }
  if (!argv.pkg) {
    throw new Error('cannot import package. please specify package with --pkg argument.')
  }

  const keys = loadKeys(cwd)
  const address = Address.fromPubKey(keys.pubKey)

  const aldea = new Aldea('node.aldea.computer', undefined, 'https')
  const coin = await aldea.loadOutput(argv.coin)

  if (coin.props.amount < 100) {
    throw Error('insufficient balance to fund transaction:', coin.props)
  }

  const tx = await aldea.createTx((tx, ref) => {
    const pkgRef  = tx.import(argv.pkg)
    const coinRef = tx.load(coin.id)

    const player1 = tx.new(pkgRef, 'Fighter', ['Scorpion'])
    const player2 = tx.new(pkgRef, 'Fighter', ['Sub-zero'])

    const sword   = tx.new(pkgRef, 'Weapon', ['Kunai Spear', 20])
    tx.call(player1, 'equip', [sword])

    tx.lock(player1, address)
    tx.lock(player2, address)
    
    tx.call(coinRef, 'send', [coin.props.motos - 100, address.hash])
    tx.fund(coinRef)
    tx.sign(keys.privKey)
  })

  const res = await aldea.commitTx(tx).catch(async e => {
    console.error(await e.response.text())
    process.exit()
  })

  console.log('Your fighters have been created!')
  console.log()
  console.log('Raw transaction data:')
  console.log(res)

  for (let data of res.outputs) {
    const output = await aldea.loadOutput(data.id)
    
    if (output.className === 'Coin' && output.lock.type === 1) {
      console.log()
      console.log('Coin ID:', output.props)
      console.log(bold(output.id))
    } else
    if (output.className === 'Fighter') {
      console.log()
      console.log('Fighter:', { name: output.props.name, weapons: output.props.weapons.length, health: output.props.health })
      console.log(bold(output.id))
    }
  }
}

createFighters(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
