import fs from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import minimist from 'minimist'
import { Aldea, KeyPair } from '@aldea/sdk-js'

/**
 * Bundles the list of files and creates a deploy transaction.
 */
async function deploy(cwd, argv) {
  const files = new Map()
  try {
    if (!argv._.length) throw new Error('no files given')
    for (let i = 0; i < argv._.length; i++) {
      const file = fs.readFileSync(join(cwd, 'aldea', argv._[i]))
      files.set(argv._[i], file)
    }
  } catch(e) {
    console.log(e.message)
    return
  }

  // TODO - here we generate a random keypair and coin location
  // These should be the real deal!!
  const keys = KeyPair.fromRandom()
  const location = crypto.randomBytes(20)

  // TODO - eventually an aldea instance should be a client
  const aldea = new Aldea()

  // Build the deploy transaction
  const tx = aldea.createTx(tx => {
    tx.load(location)
    tx.fund(0)
    tx.deploy(files)
    tx.sign(keys.privKey)
  })

  // TODO - we need to send the tx to a node!
  console.log(tx)
  console.log(tx.toHex())
}

const argv = minimist(process.argv.slice(2), {
  string: ['_']
})

deploy(process.cwd(), argv).catch((e) => {
  console.error(e)
})
