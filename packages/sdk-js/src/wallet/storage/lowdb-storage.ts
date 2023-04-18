import {Low} from 'lowdb'
import {HdWalletStorage, OwnedOutput} from "../wallet.js"
import {Output} from "../../output.js"
import {LockType} from "../../lock.js";
import {Address} from "../../address.js";
import {buffEquals} from "../../support/util.js";
import {Pointer} from "../../pointer.js";

export interface OwnedAddress {
  buff: Uint8Array,
  path: string
}

export interface WalletData {
  outputs: OwnedOutput[]
  addresses: OwnedAddress[]
  currentIndex: number
  latestUsedIndex: number
}

export class LowDbStorage implements HdWalletStorage {
  db: Low<WalletData>
  seed: Uint8Array
  constructor(low: Low<WalletData>, seed: Uint8Array) {
    this.db = low
    this.seed = seed
  }

  private async initializeData (): Promise<void> {
    this.db.data = {
      outputs: [],
      addresses: [],
      currentIndex: 0,
      latestUsedIndex: 0,
    }
  }

  private async data (): Promise<WalletData> {
    if (!this.db.data) {
      await this.db.read()
      if (!this.db.data) {
        await this.initializeData()
      }
    }
    return this.db.data as WalletData
  }

  async getInventory(): Promise<Array<Output>> {
    return this.data().then(data => data.outputs.map(o => o.output))
  }

  async addOutput(output: Output): Promise<boolean> {
    if (output.lock.type !== LockType.ADDRESS) {
      return false
    }

    const data = await this.data()

    let ownAddress = data.addresses.find(a => buffEquals(a.buff, output.lock.data));

    if (!ownAddress) {
      return false
    }

    const exists = data.outputs.some((o) => o.output.origin == output.origin)

    if (exists) {
      return false
    } else {
      data.outputs.push({ output, path: ownAddress.path })
      await this.db.write()
      return true
    }
  }

  async saveAddress(address: Address, path: string): Promise<void> {
    await this.data().then(data => data.addresses.push({
      buff: address.hash,
      path
    }))
  }

  async changeCurrentIndex(f: (newIndex: number) => number): Promise<void> {
    await this.data().then(data => data.currentIndex = f(data.currentIndex))
  }

  async changeLastUsedIndex(f: (newIndex: number) => number): Promise<void> {
    await this.data().then(data => data.latestUsedIndex = f(data.latestUsedIndex))
  }

  currentIndex(): Promise<number> {
    return this.data().then(data => data.currentIndex)
  }

  lastUsedIndex(): Promise<number> {
    return this.data().then(data => data.latestUsedIndex)
  }

  async outputById(outputId: Uint8Array): Promise<OwnedOutput | null> {
    const data = await this.data()
    return data.outputs.find(o => buffEquals(o.output.hash, outputId)) || null;
  }

  async outputByOrigin(origin: Pointer): Promise<OwnedOutput | null> {
    const data = await this.data()
    return data.outputs.find(o => o.output.origin.equals(origins)) || null;
  }
}

