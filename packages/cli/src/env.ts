import fs from 'fs'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Aldea, HDPrivKey, PrivKey } from '@aldea/sdk-js'
import { HdWallet, SingleKeyWallet, LowDbStorage } from '@aldea/wallet-lib'

const KEY_FILE = 'key.json'
const WALLET_FILE = 'wallet.json'

/**
 * TODO
 */
class Env {
  readonly cwd: string;
  readonly codeDir: string;
  readonly walletDir: string;
  readonly aldea: Aldea;
  private _key?: Low<KeyData>;
  //private walletData?: Low<LowDbData>;
  private _wallet?: HdWallet | SingleKeyWallet;

  constructor() {
    this.cwd = process.cwd()
    this.codeDir = join(this.cwd, '.')
    this.walletDir = join(this.cwd, '.aldea')
    //this.aldea = new Aldea('https://node.aldea.computer')
    this.aldea = new Aldea('http://localhost:4000')
  }

  get key(): HDPrivKey | PrivKey {
    if (!this._key) throw new Error('wallet is not initialized')
    if (this.type === 'hd') {
      return HDPrivKey.fromString(this._key.data.key)
    } else {
      return PrivKey.fromString(this._key.data.key)
    }
  }

  get type(): 'hd' | 'sk' {
    if (!this._key) throw new Error('wallet is not initialized')
    return this._key.data.type
  }

  get wallet(): HdWallet | SingleKeyWallet {
    if (!this._wallet) throw new Error('wallet is not initialized')
    return this._wallet
  }

  /**
   * TODO
   */
  async initWallet(type: string): Promise<void> {
    if (fs.existsSync(this.walletDir)) { fs.rmSync(this.walletDir, { recursive: true }) }
    fs.mkdirSync(this.walletDir)

    this._key = initDB<KeyData>(join(this.walletDir, KEY_FILE), randomKeyData(type))
    await this._key.write()
    const storage = new LowDbStorage(new JSONFile(join(this.walletDir, WALLET_FILE)))
    await storage.db.write()
    this.initTypedWallet(storage)
  }

  /**
   * TODO
   */
  async loadWallet(): Promise<void> {
    if (!fs.existsSync(this.walletDir)) {
      throw new Error('xxxx')
    }

    this._key = initDB<KeyData>(join(this.walletDir, KEY_FILE), { type: 'sk', key: '' })
    await this._key.read()
    const storage = new LowDbStorage(new JSONFile(join(this.walletDir, WALLET_FILE)))
    await storage.db.read()
    this.initTypedWallet(storage)
  }

  private initTypedWallet(storage: LowDbStorage): void {
    if (this.type === 'hd') {
      this._wallet = new HdWallet(storage, this.aldea, this.key as HDPrivKey)
    } else {
      this._wallet = new SingleKeyWallet(this.key as PrivKey, this.aldea, storage)
    }
  }
}

/**
 * TODO
 */
export const env = new Env()

type KeyData = {
  type: 'hd' | 'sk',
  key: string
}

function initDB<T>(path: string, defaultData: T): Low<T> {
  const file = new JSONFile<T>(path)
  return new Low<T>(file, defaultData)
}

function randomKeyData(type: string): KeyData {
  return type === 'hd' ?
    { type: 'hd', key: HDPrivKey.fromRandom().toString() } :
    { type: 'sk', key: PrivKey.fromRandom().toString() }
}
