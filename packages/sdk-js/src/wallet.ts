import { Tx } from "./tx.js"
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { Aldea } from "./aldea.js"
import { TxResponse } from "./aldea.js"
import { PackageResponse } from "./aldea.js"
import { KeyPair } from "./keypair.js"
import { Database, open } from "sqlite"
import * as sqlite3 from "sqlite3"
import { PrivKey } from "./privkey.js"
import { Output } from "./output.js"
import { TxBuilder } from "./tx-builder.js"
import { Pointer } from "./pointer.js"
import { Lock } from "./lock.js"
import { InstructionRef } from "./instruction.js"

export interface WalletData {
  outputs: Output[];
  packages: PackageResponse[];
  // keys: KeyPair[];
}

export interface IWalletStorage {
  getInventory(): Promise<Array<Output>>
  addOutput(output: Output): Promise<void>
  getPackages(): Promise<Array<PackageResponse>>
  addPackage(pkg: PackageResponse): Promise<void>
  // getKeys(): Promise<Array<KeyPair>>
  // addKey(key: KeyPair): Promise<void>
}

export class Wallet {
  constructor(private storage: IWalletStorage, private aldea: Aldea, private kp: KeyPair) { }

  async getInventory(): Promise<Array<Output>> {
    return this.storage.getInventory()
  }

  async getPackages(): Promise<Array<PackageResponse>> {
    return this.storage.getPackages();
  }

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const outputs = await this.getInventory()
    let motosIn = 0
    let coins: InstructionRef[] = []
    let coinRef: InstructionRef
    while (motosIn < 100) {
      const idx = outputs.findIndex(o => o.classPtr.toString() === "0000000000000000000000000000000000000000000000000000000000000000_0")
      if (idx === -1) {
        throw new Error("No coins available to fund transaction")
      }
      const coin = outputs[idx]
      outputs.splice(idx, 1)
      coinRef = partialTx.load(coin.id)
      motosIn += (coin.props as any).motos || 0
      coins.push(coinRef)
    }
    coinRef = coins.length > 1 ?
      partialTx.call(coins[0], 'combine', [coins.slice(1)]) :
      coinRef = coins[0]

    partialTx.fund(coinRef)
    return partialTx
  }

  async signTx(partialTx: TxBuilder): Promise<TxBuilder> {
    partialTx.sign(this.kp.privKey)
    return partialTx
  }

  async processTx(builder: TxBuilder): Promise<TxResponse> {
    const tx = await builder.build()
    const resp = await this.aldea.commitTx(tx)

    // Rebuild binary objects
    for (const outResp of resp.outputs) {
      const output = new Output(
        Pointer.fromString(outResp.origin),
        Pointer.fromString(outResp.location),
        Pointer.fromString(outResp.class),
        Lock.fromJson(outResp.lock),
        Buffer.from(outResp.state, 'hex'),
      )
      await this.storage.addOutput(output)
    }

    for (const pkg of resp.packages) {
      await this.storage.addPackage(pkg)
    }
    return resp
  }

  async fundSignAndBroadcastTx(partialTx: TxBuilder): Promise<TxResponse> {
    this.fundTx(partialTx)
    this.signTx(partialTx)
    return this.processTx(partialTx)
  }

  sync(): Promise<void> {
    return Promise.resolve()
  }
}

export class LowDbStorage implements IWalletStorage {
  db: Low<WalletData>
  data: Promise<WalletData>
  constructor(path: string) {
    const adapter = new JSONFile<WalletData>(`${path}/aldea-db.json`)
    this.db = new Low(adapter)
    this.data = this.db.read()
      .then(() => this.db.data = this.db.data || { outputs: [], packages: [] })
  }

  async getInventory(): Promise<Array<Output>> {
    const data = await this.data
    return data.outputs || []
  }

  async addOutput(output: Output): Promise<void> {
    const data = await this.data
    const prev = data.outputs?.find((o) => o.origin == output.origin)
    if (prev) {
      Object.assign(prev, output)
    } else {
      data.outputs?.push(output)
    }
    await this.db.write()
  }

  async getPackages(): Promise<Array<PackageResponse>> {
    const data = await this.data
    return data.packages || []
  }

  async addPackage(pkg: PackageResponse): Promise<void> {
    const data = await this.data
    data.packages?.push(pkg)
    await this.db.write()
  }

  // async getKeys(): Promise<Array<KeyPair>> {
  //   const data = await this.data
  //   return data.keys || []
  // }

  // async addKey(key: KeyPair): Promise<void> {
  //   const data = await this.data
  //   data.keys?.push(key)
  //   await this.db.write()
  // }
}

export class SqliteStorage implements IWalletStorage {
  private db: Promise<Database>
  constructor(private path: string) {
    this.db = open({
      filename: path,
      driver: sqlite3.Database
    }).then(async (db) => {
      await db.migrate({
        migrationsPath: `${__dirname}/../migrations`,
      })
      return db
    })
  }

  async getInventory(): Promise<Array<Output>> {
    const db = await this.db
    const rows = await db.all("SELECT * FROM outputs")
    const outputs: Array<Output> = [];
    for (const row of rows) {
      outputs.push(new Output(
        Pointer.fromBytes(row.origin),
        Pointer.fromBytes(row.location),
        Pointer.fromBytes(row.class),
        Lock.fromBytes(row.lock),
        row.state,
        JSON.parse(row.abi)
      ))
    }
    return outputs
  }

  async addOutput(output: Output): Promise<void> {
    const db = await this.db
    await db.run(`INSERT OR REPLACE INTO outputs(id, origin, location, class, lock, state, abi) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      output.id,
      output.origin.toBytes(),
      output.location.toBytes(),
      output.classPtr.toBytes(),
      output.lock.toBytes(),
      output.stateBuf,
      JSON.stringify(output.abi)
    )
  }

  async getPackages(): Promise<Array<PackageResponse>> {
    const db = await this.db
    const rows = await db.all<{ doc: string }[]>("SELECT * FROM packages")
    const packages: Array<PackageResponse> = [];
    for (const row of rows) {
      packages.push(JSON.parse(row.doc))
    }
    return packages
  }

  async addPackage(pkg: PackageResponse): Promise<void> {
    const db = await this.db
    await db.run("INSERT INTO packages (doc) VALUES (?)", JSON.stringify(pkg))
  }

  // async getKeys(): Promise<Array<KeyPair>> {
  //   const db = await this.db
  //   const rows = await db.all("SELECT privkey FROM keys")
  //   const keys: Array<KeyPair> = [];
  //   for (const row of rows) {
  //     keys.push(KeyPair.fromPrivKey(PrivKey.fromHex(row.privkey)))
  //   }
  //   return keys
  // }

  // async addKey(key: KeyPair): Promise<void> {
  //   const db = await this.db
  //   await db.run("INSERT INTO keys (privkey) VALUES (?)", key.privKey.toHex())
  // }
}