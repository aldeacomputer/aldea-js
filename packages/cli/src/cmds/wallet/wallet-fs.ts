import fs from 'fs'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { HDPrivKey, PrivKey } from '@aldea/sdk-js'

export class WalletFS {
  //readonly dbPath: string;
  readonly keys: Low<KeyData>;

  constructor(readonly dir: string) {
    const keyPath = join(this.dir, 'keys.json')
    const keyFile = new JSONFile<KeyData>(keyPath)
    this.keys = new Low<KeyData>(keyFile)
    
    this.keys.read()
  }

  static async init(dir: string, type: string): Promise<WalletFS> {
    if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true }) }
    fs.mkdirSync(dir)

    const wallet = new WalletFS(dir)
    await wallet.keys.read()

    switch(type) {
      case 'hd':
        const hdKey = HDPrivKey.fromRandom()
        wallet.keys.data = { type, key: hdKey.toString() }
        break
      case 'sk':
        const privKey = PrivKey.fromRandom()
        wallet.keys.data = { type, key: privKey.toString() }
        break
      default:
        throw new Error('invalid wallet type')
    }

    await wallet.keys.write()

    return wallet
  }
}

export type KeyData = {
  type: 'hd' | 'sk',
  key: string
}