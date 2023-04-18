import {Aldea, TxResponse} from "../aldea.js"
import {Output} from "../output.js"
import {TxBuilder} from "../tx-builder.js"
import {InstructionRef, OpCode} from "../instruction.js"
import {Address} from "../address.js";
import {HDPrivKey} from "../hd-privkey.js";
import {LoadByOriginInstruction, LoadInstruction} from "../instructions/index.js";
import {Pointer} from "../pointer.js";
import {HDPubKey} from "../hd-pubkey.js";

export interface HdWalletStorage {
  getInventory(): Promise<Array<Output>>

  addOutput(output: Output): Promise<boolean>
  currentIndex (): Promise<number>,
  changeCurrentIndex (f: (newIndex: number) => number): Promise<number>
  lastUsedIndex (): Promise<number>
  changeLastUsedIndex (f: (newIndex: number) => number): Promise<number>

  saveAddress(address: Address, path: string): Promise<void>;

  outputById(outputId: Uint8Array): Promise<OwnedOutput | null>;

  outputByOrigin(outputId: Pointer): Promise<OwnedOutput | null>;
}

const PATH_PREFFIX = "/0h/"

export class HdWallet implements Wallet {
  constructor(private storage: HdWalletStorage, private aldea: Aldea, private hd: HDPrivKey) {}

  async getInventory(): Promise<Array<Output>> {
    return this.storage.getInventory()
  }

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const outputs = await this.getInventory()
    let motosIn = 0
    let coins: InstructionRef[] = []

    while (motosIn < 100) {
      const idx = outputs.findIndex(o => o.classPtr.toString() === "0000000000000000000000000000000000000000000000000000000000000000_0")
      if (idx === -1) {
        throw new Error("No coins available to fund transaction")
      }
      const coin = outputs[idx]
      outputs.splice(idx, 1)
      const coinRef = partialTx.load(coin.id)
      motosIn += (coin.props as any).motos || 0
      coins.push(coinRef)
    }

    const fundCoin = coins[0]
    if (coins.length > 1) {
      let [first, ...rest] = coins
      partialTx.call(first, 'combine', [rest])
    }

    partialTx.fund(fundCoin)
    return partialTx
  }

  async signTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const tx = await partialTx.build()

    const outputIds = tx.instructions
      .filter(i => i.opcode === OpCode.LOAD)
      .map(i => {
        const inst = i as LoadInstruction
        return inst.outputId
      })

    const originsAsBytes = tx.instructions
      .filter(i => i.opcode === OpCode.LOADBYORIGIN)
      .map(i => {
        const inst = i as LoadByOriginInstruction
        return inst.origin
      })

    const paths = []

    for (const outputId of outputIds) {
      const ownedOutput = await this.storage.outputById(outputId)
      if (ownedOutput) {
        paths.push(ownedOutput.path)
      }
    }

    for (const originBytes of originsAsBytes) {
      const ownedOutput = await this.storage.outputByOrigin(Pointer.fromBytes(originBytes))
      if (ownedOutput) {
        paths.push(ownedOutput.path)
      }
    }

    for (const path of paths) {
      const priv = this.hd.derive(path.replace('M', 'm'))
      if (priv instanceof HDPubKey) {
        throw new Error('should be a priate key')
      }
      partialTx.sign(priv)
    }

    return partialTx
  }

  async processTx(builder: TxBuilder): Promise<TxResponse> {
    const tx = await builder.build()
    const resp = await this.aldea.commitTx(tx)

    // Rebuild binary objects
    for (const outResp of resp.outputs) {
      const output = Output.fromJson(outResp)
      await this.storage.addOutput(output)
    }
    return resp
  }

  async fundSignAndBroadcastTx(partialTx: TxBuilder): Promise<TxResponse> {
    await this.fundTx(partialTx)
    await this.signTx(partialTx)
    return this.processTx(partialTx)
  }

  async getNextAddress(): Promise<Address> {
    const index = await this.storage.currentIndex()
    const lastUsed = await this.storage.lastUsedIndex()

    const next = index - lastUsed > 20
      ? lastUsed
      : index

    const path = `M/${PATH_PREFFIX}/${index}`; // Derive pubkey
    const hdPub = this.hd.derive(path);
    const address = hdPub.toPubKey().toAddress();
    await this.storage.saveAddress(address, path)
    await this.storage.changeCurrentIndex(_ => next + 1)
    return address
  }

  sync(): Promise<void> {
    return Promise.resolve()
  }
}

export interface Wallet {
  getInventory(): Promise<Array<Output>>

  fundTx(partialTx: TxBuilder): Promise<TxBuilder>

  signTx(partialTx: TxBuilder): Promise<TxBuilder>

  processTx(builder: TxBuilder): Promise<TxResponse>

  fundSignAndBroadcastTx(partialTx: TxBuilder): Promise<TxResponse>

  sync(): Promise<void>
}

export interface OwnedOutput {
  output: Output
  path: string
}
