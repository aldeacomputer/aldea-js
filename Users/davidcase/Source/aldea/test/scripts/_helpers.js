import fs from 'fs'
import { join } from 'path'
import dotenv from 'dotenv'
import { KeyPair, PrivKey } from '@aldea/sdk-js'

export function buildPackage(cwd, files) {
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

export function loadKeys(cwd) {
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