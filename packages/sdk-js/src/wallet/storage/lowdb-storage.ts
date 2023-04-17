import { Adapter, Low } from 'lowdb'
import { WalletStorage } from "../wallet.js"
import { Output } from "../../output.js"
import { PackageResponse } from "../../aldea.js"

export interface WalletData {
  outputs: Output[];
  packages: PackageResponse[];
  // keys: KeyPair[];
}

export class LowDbStorage implements WalletStorage {
  db: Low<WalletData>
  data: Promise<WalletData>
  constructor(adapter: Adapter<WalletData>) {
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

