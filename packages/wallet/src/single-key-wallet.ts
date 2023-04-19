import {
  Address,
  Aldea,
  CommitTxResponse,
  CreateTxCallback,
  LockType,
  Output,
  Pointer,
  PrivKey,
  Tx,
  TxBuilder,
  util
} from '@aldea/sdk-js'
import {Wallet} from "./wallet.js";
import {Abi} from "@aldea/compiler/abi";

const COIN_CLASS_PTR = Pointer.fromString("0000000000000000000000000000000000000000000000000000000000000000_0")


export class SingleKeyWallet implements Wallet {
  private privKey: PrivKey
  private inventory: Output[]
  private client: Aldea
  private txHistory: Tx[]
  private abis: Map<string, Abi>

  constructor(pk: PrivKey, client: Aldea) {
    this.privKey = pk
    this.inventory = []
    this.client = client
    this.txHistory = []
    this.abis = new Map<string, Abi>()
  }

  async addOutput(output: Output): Promise<void> {
    if (output.lock.type !== LockType.ADDRESS) return

    if (!util.buffEquals(output.lock.data, this.address().hash)) return

    if (!output.abi) {
      const abi = await this.fetchAbi(output.classPtr.id)
      output.abi = abi
    }

    this.inventory = this.inventory.filter(o => o.origin.equals(output.origin))
    this.inventory.push(output)
  }

  async fundSignAndBroadcastTx(fn: CreateTxCallback): Promise<CommitTxResponse> {
    const tx = await this.client.createTx(async (builder, ref) => {
      await fn(builder, ref)
      await this.fundTx(builder)
      await this.signTx(builder)
    })
    const result = await this.client.commitTx(tx)

    const outputs  = await Promise.all(result.outputs.map(async (or) => {
      return Output.fromJson(or)
    }))

    await this.processTx(tx, outputs)
    return result
  }

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const coins = this.inventory.filter((o: Output) => o.classPtr.equals(COIN_CLASS_PTR))
    const coin  = coins.find(c => {
      const props = c.props
      if (!props) { throw Error('error')}
      const motos = props['motos']
      return motos > 100
    })
    if (!coin) {
      throw new Error('now enough funds')
    }

    const coinIdx = partialTx.load(coin.id)
    const fundCoinIdx = partialTx.call(coinIdx, 'send', [100])
    partialTx.fund(fundCoinIdx)
    return partialTx;
  }

  async getInventory(): Promise<Array<Output>> {
    return this.inventory
  }

  async getNextAddress(): Promise<Address> {
    return this.privKey.toPubKey().toAddress()
  }

  async processTx(tx: Tx, outputList: Output[]): Promise<void> {
    await Promise.all(outputList.map(output => this.addOutput(output)))
    this.txHistory.push(tx)
  }

  async signTx(partialTx: TxBuilder): Promise<TxBuilder> {
    partialTx.sign(this.privKey)
    return partialTx
  }

  sync(): Promise<void> {
    return Promise.resolve(undefined);
  }

  private address() {
    return this.privKey.toPubKey().toAddress()
  }

  private async fetchAbi(pkgId: string) {
    let abi = this.abis.get(pkgId)
    if (!abi) {
      const newAbi = await this.client.getPackageAbi(pkgId)
      this.abis.set(pkgId, newAbi)
      abi = newAbi
    }
    return abi
  }
}
