import { Aldea } from "./aldea.js"
import { TxResponse } from "./aldea.js"
import { PackageResponse } from "./aldea.js"
import { KeyPair } from "./keypair.js"
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