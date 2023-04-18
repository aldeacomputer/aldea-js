
import { Database, open } from "sqlite"
import sqlite3 from "sqlite3"
import { HdWalletStorage } from "@aldea/sdk-js/dist/wallet/wallet.js"
import { Output } from "@aldea/sdk-js/dist/output.js"
import { Pointer } from "@aldea/sdk-js/dist/pointer.js"
import { Lock } from "@aldea/sdk-js/dist/lock.js"
import { PackageResponse } from "@aldea/sdk-js/dist/aldea.js"
import * as url from 'url';
// const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export class SqliteStorage implements HdWalletStorage {
    public db: Promise<Database>
    constructor(private path: string) {
      console.log('Path: ', path)
      this.db = open({
        filename: path,
        driver: sqlite3.Database
      }).then(async (db) => {
        const migrationsPath = `${__dirname}../../sqlite-migrations`
        console.log('Migrations path: ', migrationsPath)
        await db.migrate({
          migrationsPath,
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
