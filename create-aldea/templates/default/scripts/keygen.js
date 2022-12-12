import fs from 'fs'
import { join } from 'path'
import minimist from 'minimist'
import { Address, KeyPair } from '@aldea/sdk-js'

/**
 * Generates a set of keys and stores them to an Aldea keyfile.
 */
async function keygen(cwd, argv) {
  const filename = '.aldea'
  const keysFile = join(cwd, filename)

  if (fs.existsSync(keysFile) && !argv.f) {
    throw new Error(`file ${filename} already exists. invoke command with -f to overwrite.`)
  }

  fs.writeFileSync(keysFile, generateKeyFile())
  console.log(`keys successfully written to file ${filename}`)
}

// Generates keyfile data
function generateKeyFile() {
  const keys = KeyPair.fromRandom()
  const addr = Address.fromPubKey(keys.pubKey)
  const chunks = []
  chunks.push(`PRIVKEY: ${keys.privKey.toHex()}`)
  chunks.push(`PUBKEY: ${keys.pubKey.toHex()}`)
  chunks.push(`ADDRESS: ${addr.toString()}`)
  return chunks.join('\n')
}

keygen(
  process.cwd(),
  minimist(process.argv.slice(2), { string: ['_'] })
).catch((e) => {
  console.error(e.message)
})
