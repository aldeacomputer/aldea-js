import {OwnedAddress, OwnedOutput, WalletStorage} from "./wallet-storage.js";
import {Abi} from "@aldea/compiler/abi";
import {Address, base16, Output, Pointer, Tx} from "@aldea/sdk-js";

type AbiItem = {
  abi: Abi,
  pkgId: string
}

export class MemoryStorage implements WalletStorage {
  utxos: OwnedOutput[]
  addresses: OwnedAddress[]
  abis: AbiItem[]
  txs: Tx[]
  _currentIndex: number
  _latestUsedIndex: number

  constructor() {
    this.utxos = []
    this.addresses = []
    this.abis = []
    this.txs = []
    this._currentIndex = 0
    this._latestUsedIndex = 0
  }
  async abiByPkgId(pkgId: string): Promise<Abi | null> {
    const res = this.abis.find(a => a.pkgId === pkgId)
    if (!res) return null
    return res.abi
  }

  async addAbi(pkgId: string, abi: Abi): Promise<void> {
    const exists = this.abis.some(a => a.pkgId === pkgId)
    if (!exists) {
      this.abis.push({ pkgId, abi })
    }
  }

  async addressByPubKeyHash(pubKeHashStr: string): Promise<OwnedAddress | null> {
    let addr = this.addresses.find(a => base16.encode(a.address.hash) === pubKeHashStr)
    if (!addr) return null
    return addr
  }

  async allUtxos(): Promise<Output[]> {
    return this.utxos.map(u => u.output);
  }

  async changeCurrentIndex(f: (newIndex: number) => number): Promise<number> {
    return this._currentIndex;
  }

  async changeLastUsedIndex(f: (newIndex: number) => number): Promise<number> {
    this._latestUsedIndex = f(this._latestUsedIndex)
    return this._latestUsedIndex
  }

  async currentIndex(): Promise<number> {
    return this._currentIndex;
  }

  async latestUsedIndex(): Promise<number> {
    return this._latestUsedIndex
  }

  async removeUtxoByOrigin(origin: Pointer): Promise<void> {
    this.utxos = this.utxos.filter(u => !u.output.origin.equals(origin))
  }

  async saveAddress(address: Address, path: string): Promise<void> {
    this.addresses.push({ address, path })
  }

  async saveTx(tx: Tx): Promise<void> {
    this.txs.push(tx)
  }

  async saveUtxo(output: Output, path: string): Promise<void> {
    this.utxos.push({ output, path })
  }

  async utxoById(outputId: string): Promise<OwnedOutput | null> {
    const res = this.utxos.find(u => u.output.id === outputId)
    if (!res) return null
    return res
  }

  async utxoByOrigin(origin: Pointer): Promise<OwnedOutput | null> {
    const res = this.utxos.find(u => u.output.origin.equals(origin) )
    if (!res) return null
    return res
  }
}
