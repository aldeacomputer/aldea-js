import { Lock } from "./lock.js";
import { Output } from "./output.js";
import { Pointer } from "./pointer.js";
import { Tx } from "./tx.js";
import * as sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';

export interface IWallet {
  /**
   * Updates the storage saving the new jith the associated paths
   */
  sync(): Promise<void>

  /**
    * Returns a list of wallet items
    */
  getInventory(): Promise<Array<Output>>

  /**
   * Given a tx execution, consumes the inputs on the storage
   * and saved the newly created jig states.
   */
  processTx(tx: Tx): Promise<Array<Output>>
  signTx(partialTx: Tx): Tx
}

export interface IWalletStorage {
  getInventory(): Promise<Array<Output>>
}

export class Wallet implements IWallet{
  constructor(private storage: IWalletStorage) { }

  async getInventory(): Promise<Array<Output>> {
    return await this.storage.getInventory()
  }

  async processTx(tx: Tx): Promise<Array<Output>> {
    return []
  }

  signTx(partialTx: Tx): Tx {
    return partialTx
  }

  sync(): Promise<void> {
    return Promise.resolve()
  }
}

export class SqliteStorage implements IWalletStorage {
  private db: Promise<Database>
  constructor(private path: string) {
    this.db = open({
      filename: path,
      driver: sqlite3.Database
    }).then(async (db) => {
      await db.migrate({
        migrationsPath: "./migrations",
      })
      return db
    })
  }

  async getInventory(): Promise<Array<Output>> {
    const db = await this.db
    const rows = await db.all("SELECT * FROM txos")
    const outputs: Array<Output> = [];
    for (const row of rows) {
      outputs.push(new Output(
        Pointer.fromBytes(row.origin),
        Pointer.fromBytes(row.location),
        Pointer.fromBytes(row.class),
        Lock.fromBytes(row.lock),
        row.state,
      ))
    }
    return outputs
  }
}