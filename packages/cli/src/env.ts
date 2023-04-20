import fs from 'fs'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Aldea, HDPrivKey, PrivKey } from '@aldea/sdk-js'
import { HdWallet, LowDbStorage } from '@aldea/wallet-lib/dist/index.js'
import { WalletData } from '@aldea/wallet-lib/dist/storage/index.js'

const DATA_FILE = 'data.json'
const KEY_FILE = 'key.json'

/**
 * TODO
 */
class Env {
  readonly cwd: string;
  readonly aldea: Aldea;
  private keyData?: Low<KeyData>;
  private walletData?: Low<WalletData>;
  private _wallet?: HdWallet;

  constructor() {
    this.cwd = process.cwd()
    //this.aldea = new Aldea('https://node.aldea.computer')
    this.aldea = new Aldea('http://localhost:4000')
  }

  get wallet(): HdWallet {
    if (!this._wallet) throw new Error('wallet is not initialized')
    return this._wallet
  }

  /**
   * TODO
   */
  async initWallet(dir: string, type: string): Promise<void> {
    if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true }) }
    fs.mkdirSync(dir)

    this.keyData = initDB<KeyData>(join(dir, KEY_FILE), randomKeyData(type))
    this.walletData = initDB<WalletData>(join(dir, DATA_FILE), defaultWalletData)
    await this.keyData.write()
    await this.walletData.write()

    const storage = new LowDbStorage(this.walletData)
    const key = HDPrivKey.fromString(this.keyData.data.key)
    this._wallet = new HdWallet(storage, this.aldea, key)
  }

  /**
   * TODO
   */
  async loadWallet(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      throw new Error('xxxx')
    }

    this.keyData = initDB<KeyData>(join(dir, KEY_FILE), { type: 'sk', key: '' })
    this.walletData = initDB<WalletData>(join(dir, DATA_FILE), defaultWalletData)
    await this.keyData.read()
    await this.walletData.read()

    const storage = new LowDbStorage(this.walletData)
    const key = HDPrivKey.fromString(this.keyData.data.key)
    this._wallet = new HdWallet(storage, this.aldea, key)
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

const defaultWalletData: WalletData = {
  outputs: [],
  addresses: [],
  txs: [],
  currentIndex: 0,
  latestUsedIndex: 0,
}
