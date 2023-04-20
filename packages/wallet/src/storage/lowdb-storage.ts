import {Adapter, Low} from 'lowdb'
import {Address, base16, Output, Pointer, Tx} from '@aldea/sdk-js'
import {Abi, abiFromCbor, abiToCbor} from "@aldea/compiler/abi";
import {OwnedAddress, OwnedOutput, WalletStorage} from "./wallet-storage.js";


type OutputItem = {
  origin: string,
  id: string,
  outputHex: string
  path: string
}

type AddressItem = {
  addrStr: string,
  hash: string,
  path: string
}

type AbiItem = {
  abiStr: string,
  pkgId: string
}

type TxItem = {
  id: string,
  txHex: string
}

export interface HdWalletData {
  utxos: OutputItem[]
  addresses: AddressItem[]
  abis: AbiItem[]
  currentIndex: number
  latestUsedIndex: number
  txs: TxItem[]
}

export class LowDbStorage implements WalletStorage {
  db: Low<HdWalletData>
  constructor(adapter: Adapter<HdWalletData>) {
    this.db = new Low(adapter, {
      utxos: [],
      txs: [],
      addresses: [],
      abis: [],
      currentIndex: 0,
      latestUsedIndex: 0
    })
  }

  private data (): HdWalletData {
    return this.db.data
  }

  async allUtxos(): Promise<Array<Output>> {
    this.data().utxos.map(o => o)
    return this.data().utxos.map(ownedUtxo => {
      const output = Output.fromHex(ownedUtxo.outputHex)
      const abi = this.data().abis.find(u => u.pkgId === output.classPtr.id)
      if (abi === undefined) {
        throw new Error('abi should be present')
      }
      output.abi = abiFromCbor(base16.decode(abi.abiStr).buffer)
      return output
    })
  }

  async saveUtxo(output: Output, path: string): Promise<void> {
    this.data().utxos.push({
      id: output.id,
      origin: output.origin.toString(),
      outputHex: output.toHex(),
      path: path
    })

    await this.db.write()
  }

  async saveAddress(address: Address, path: string): Promise<void> {
    this.data().addresses.push({
      addrStr: address.toString(),
      hash: base16.encode(address.hash),
      path: path
    })
    await this.db.write()
  }

  async changeCurrentIndex(f: (newIndex: number) => number): Promise<number> {
    this.data().currentIndex = f(this.data().currentIndex)
    await this.db.write()
    return this.data().currentIndex
  }

  async changeLastUsedIndex(f: (newIndex: number) => number): Promise<number> {
    this.data().latestUsedIndex = f(this.data().latestUsedIndex)
    await this.db.write()
    return this.data().latestUsedIndex
  }

  async currentIndex(): Promise<number> {
    return this.data().currentIndex
  }

  async latestUsedIndex(): Promise<number> {
    return this.data().latestUsedIndex
  }

  async utxoById(outputId: string): Promise<OwnedOutput | null> {
    const outputItem = this.data().utxos.find(u => u.id === outputId);
    if (!outputItem) {
      return null
    }
    const output = Output.fromHex(outputItem.outputHex)
    const abiItem = this.data().abis.find(a => a.pkgId === output.classPtr.id)
    if (!abiItem) {
      throw new Error('abi should be present')
    }
    output.abi = abiFromCbor(base16.decode(abiItem.abiStr).buffer)
    return {
      output: output,
      path: outputItem.path
    }
  }

  async utxoByOrigin(origin: Pointer): Promise<OwnedOutput | null> {
    const outputItem = this.data().utxos.find(u => u.origin === origin.toString());
    if (!outputItem) {
      return null
    }
    const output = Output.fromHex(outputItem.outputHex)
    const abiItem = this.data().abis.find(a => a.pkgId === output.classPtr.id)
    if (!abiItem) {
      throw new Error('abi should be present')
    }
    output.abi = abiFromCbor(base16.decode(abiItem.abiStr).buffer)
    return {
      output: output,
      path: outputItem.path
    }
  }

  async saveTx (tx: Tx): Promise<void> {
    this.data().txs.push({
      id: tx.id,
      txHex: tx.toHex()
    })
    await this.db.write()
  }

  async removeUtxoByOrigin(origin: Pointer): Promise<void> {
    this.data().utxos = this.data().utxos.filter(u => u.origin !== origin.toString())
    await this.db.write()
  }

  async addressByPubKeyHash(pubKeHashStr: string): Promise<OwnedAddress | null> {
    let addr = this.db.data.addresses.find(a => a.hash === pubKeHashStr)
    if (!addr) return null
    return {
      address: Address.fromString(addr.addrStr),
      path: addr.path
    }
  }

  async addAbi(pkgId: string, abi: Abi): Promise<void> {
    const exists = this.data().abis.some(a => a.pkgId === pkgId)
    if (!exists) {
      this.data().abis.push({
        abiStr: base16.encode(new Uint8Array(abiToCbor(abi))) ,
        pkgId
      })
      return Promise.resolve(undefined);
    }
  }

  async abiByPkgId(pkgId: string): Promise<Abi | null> {
    const abiItem = this.data().abis.find(a => a.pkgId === pkgId);
    if (!abiItem) {
      return null
    }
    return abiFromCbor(base16.decode(abiItem.abiStr).buffer)
  }
}

