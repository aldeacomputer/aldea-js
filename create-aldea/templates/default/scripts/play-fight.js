import fs from 'fs'
import { join } from 'path'
import minimist from 'minimist'
import { bold } from 'kolorist'
import dotenv from 'dotenv'
import { Address, Aldea, KeyPair, PrivKey } from '@aldea/sdk-js'

/**
 * TODO
 */
async function play(cwd, argv) {
  if (!argv.coin) {
    throw new Error('cannot fund transaction. please specify funding coin with --coin argument.')
  }
  if (!argv.p1) {
    throw new Error('cannot load player1. please specify fighter with --p1 argument.')
  }
  if (!argv.p2) {
    throw new Error('cannot load player2. please specify fighter with --p2 argument.')
  }

  const keys = loadKeys(cwd)
  const address = Address.fromPubKey(keys.pubKey)

  const aldea = new Aldea('localhost', 4000)
  const coin = await aldea.loadOutput(argv.coin)

  if (coin.props.amount < 100) {
    throw Error('insufficient balance to fund transaction:', coin.props)
  }

  // Build the deploy transaction
  const tx = await aldea.createTx((tx, ref) => {
    const coinRef = tx.load(coin.id)
    const player1 = tx.load(argv.p1)
    const player2 = tx.load(argv.p2)

    tx.call(player1, 'attack', [player2])
    
    tx.fund(coinRef)
    tx.lock(coinRef, address)
    tx.sign(keys.privKey)
  })

  const res = await aldea.commitTx(tx).catch(async e => {
    console.error(await e.response.text())
    process.exit()
  })

  // TODO - format and explain the output
  console.log('it worked...')
  console.log(res)
  for (let data of res.outputs) {
    const output = await aldea.loadOutput(data.id)
    console.log(output.props)
  }
}

function loadKeys(cwd) {
  const filename = '.aldea'
  const keysFile = join(cwd, filename)

  try {
    const data = fs.readFileSync(keysFile)
    const keys = dotenv.parse(data)
    const privKey = PrivKey.fromHex(keys.PRIVKEY)
    return KeyPair.fromPrivKey(privKey)
  } catch(e) {
    throw new Error(`file ${filename} does not exists. invoke setup command first.`)
  }
}

play(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
