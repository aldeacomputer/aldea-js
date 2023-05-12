import fs from 'fs'
import { join } from 'path'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Aldea, HDPrivKey, PrivKey } from '@aldea/sdk'
import { HdWallet, SingleKeyWallet, LowDbStorage } from '@aldea/wallet-lib'
import { Config } from './config.js'

const KEY_FILE = 'key.json'
const WALLET_FILE = 'wallet.json'

/**
 * Aldea CLI Environment
 */
export class Env {
  readonly cwd: string;
  private opts: Config;
  
  private _aldea: Aldea;
  private _key?: Low<KeyData>;
  private _wallet?: HdWallet | SingleKeyWallet;

  constructor(config: Config) {
    this.opts = config
    this.cwd = process.cwd()
    this._aldea = new Aldea(this.opts.nodeUrl)
  }

  get codeDir(): string { return join(this.cwd, this.opts.codeDir) }
  get walletDir(): string { return join(this.cwd, this.opts.walletDir) }
  get aldea(): Aldea { return this._aldea }

  get key(): HDPrivKey | PrivKey {
    if (!this._key) throw new Error('wallet is not initialized')
    if (this.walletType === 'hd') {
      return HDPrivKey.fromString(this._key.data.key)
    } else {
      return PrivKey.fromString(this._key.data.key)
    }
  }

  get wallet(): HdWallet | SingleKeyWallet {
    if (!this._wallet) throw new Error('wallet is not initialized')
    return this._wallet
  }

  get walletType(): 'hd' | 'sk' {
    if (!this._key) throw new Error('wallet is not initialized')
    return this._key.data.type
  }

  /**
   * Reconfigures the environment with the config config
   */
  configure(config: Partial<Config>): void {
    this.opts = { ...this.opts, ...config }
    this._aldea = new Aldea(this.opts.nodeUrl)
  }

  /**
   * Creates a new wallet in the current directory
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
   * Loads the wallet from the current directory
   */
  async loadWallet(): Promise<void> {
    if (!fs.existsSync(this.walletDir)) { throw new Error('wallet not found') }

    this._key = initDB<KeyData>(join(this.walletDir, KEY_FILE), { type: 'sk', key: '' })
    await this._key.read()
    const storage = new LowDbStorage(new JSONFile(join(this.walletDir, WALLET_FILE)))
    await storage.db.read()
    this.initTypedWallet(storage)
  }

  private initTypedWallet(storage: LowDbStorage): void {
    if (this.walletType === 'hd') {
      this._wallet = new HdWallet(this.key as HDPrivKey, storage, this.aldea)
    } else {
      this._wallet = new SingleKeyWallet(this.key as PrivKey, storage, this.aldea)
    }
  }
}

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
