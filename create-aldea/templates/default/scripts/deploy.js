import fs from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import minimist from 'minimist'
import { Aldea, KeyPair } from '@aldea/sdk-js'

/**
 * Bundles the list of files and creates a deploy transaction.
 */
async function deploy(cwd, argv) {
  if (!argv.fund) {
    throw new Error('cannot fund transaction. please specify funding coin with --fund argument.')
  }

  const keys = loadKeys(cwd)
  const pkg = buildPackage(cwd, argv._)
  const address = Address.fromPubKey(keys.pubKey)

  const aldea = new Aldea({ node: 'http://localhost:4000' })
  const { jig_ref: coinRef } = await aldea.getOutput(argv.fund)

  // Build the deploy transaction
  const tx = await aldea.createTx(tx => {
    const coin =  tx.loadByRef(coinRef)
                  tx.deploy(pkg)
                  tx.fund(coin)
                  tx.lock(coin, address)
                  tx.sign(keys.privKey)
  })

  // TODO - we need to send the tx to a node!
  console.log(tx)
  console.log(tx.toHex())

  const res = await aldea.commit(tx).catch(async e => {
    console.log(await e.response.text())
  })
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
    throw new Error(`file ${filename} does not exists. invoke setup command first.`)
  }
}

// Builds a package map
function buildPackage(cwd, files) {
  const pkg = new Map()
  try {
    if (!files.length) throw new Error('no files given')
    for (let i = 0; i < files.length; i++) {
      const file = fs.readFileSync(join(cwd, 'aldea', files[i]))
      pkg.set(files[i], file.toString())
    }
  } catch (e) {
    console.log(e.message)
    process.exit()
  }
  
  return pkg
}

deploy(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
