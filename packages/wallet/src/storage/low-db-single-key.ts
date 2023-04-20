import {Adapter, Low} from "lowdb";
import {Abi} from "@aldea/compiler/abi";
import {base16, Output, Pointer, Tx} from "@aldea/sdk-js";
import {abiFromCbor, abiToCbor} from "@aldea/compiler/abi";
import {SingleKeyWalletStorage} from "../single-key-wallet.js";

type AbiItem = {
  abiStr: string,
  pkgId: string
}

type UtxoItem = {
  id: string,
  origin: string,
  outputHex: string
}

type TxItem = {
  id: string,
  txHex: string
}

interface LowDbData {
  abis: AbiItem[],
  utxos: UtxoItem[],
  txs: TxItem[]
}

export class LowDbSingleKeyWalletStorage implements SingleKeyWalletStorage {
  private low: Low<LowDbData>;

  constructor(adapter: Adapter<LowDbData>) {
    this.low = new Low<LowDbData>(adapter, {
      abis: [],
      txs: [],
      utxos: []
    })
  }

  async read(): Promise<void> {
    await this.low.read()
  }

  private data(): LowDbData {
    return this.low.data
  }

  async addAbi(pkgId: string, abi: Abi): Promise<void> {
    this.data().abis.push({
      pkgId,
      abiStr: base16.encode(new Uint8Array((abiToCbor(abi))))
    })
    await this.low.write()
  }

  async addTx(tx: Tx): Promise<void> {
    this.data().txs.push({
      id: tx.id,
      txHex: tx.toHex()
    })
    await this.low.write()
  }

  async addUtxos(utxo: Output): Promise<void> {
    this.data().utxos.push({
      id: utxo.id,
      origin: utxo.origin.toString(),
      outputHex: utxo.toHex()
    })
    await this.low.write()
  }

  async allUtxos(): Promise<Output[]> {
    return Promise.all(this.data().utxos.map(async u => {
      const output = Output.fromHex(u.outputHex)
      const abi = await this.getAbi(output.classPtr.id)
      if (!abi) {
        throw new Error(`unknown abi for pkg: ${output.classPtr.id}, needed for: ${output.origin.toString()}`)
      }

      output.abi = abi

      return output
    }))
  }

  async getAbi(pkgId: string): Promise<Abi | null> {
    const abiItem = this.data().abis.find(e => e.pkgId === pkgId);
    if (!abiItem) {
      return null
    }
    return abiFromCbor(base16.decode(abiItem.abiStr).buffer);
  }

  async removeUtxoByOrigin(origin: Pointer): Promise<void> {
    this.data().utxos = this.data().utxos.filter(u => u.origin !== origin.toString())
    await this.low.write()
  }
}
