import {
  CommitTxResponse,
  CreateTxCallback,
  Output,
  TxBuilder,
  Tx, Address, Aldea
} from "@aldea/sdk-js"
import {COIN_CLASS_PTR} from "./constants.js";

export abstract class Wallet {
  protected client: Aldea
  constructor (client: Aldea) {
    this.client = client
  }

  abstract getNextAddress(): Promise<Address>
  abstract getInventory(): Promise<Array<Output>>
  abstract signTx(partialTx: TxBuilder): Promise<TxBuilder>
  abstract saveTxExec(tx: Tx, outputList: Output[]): Promise<void>
  abstract addUtxo(output: Output): Promise<void>
  abstract sync(): Promise<void>

  async fundTx(partialTx: TxBuilder): Promise<TxBuilder> {
    const outputs = await this.getInventory()
    const coinOutputs = outputs.filter(o => o.classPtr.equals(COIN_CLASS_PTR))

    let motosIn = 0

    for (const coinOutput of coinOutputs) {
      const coin = coinOutput
      const coinRef = partialTx.load(coin.id)

      const props = coin.props
      if (!props) throw new Error('outputs should have abi')
      motosIn += props.motos

      if (motosIn > 100) {
        let changeRef = partialTx.call(coinRef, 'send', [motosIn - 100])
        partialTx.lock(changeRef, await this.getNextAddress())
        motosIn = 100
      }

      partialTx.fund(coinRef)

      if (motosIn === 100) {
        break
      }
    }

    return partialTx
  }

  async commitTx(tx: Tx): Promise<CommitTxResponse> {
    const response = await this.client.commitTx(tx)
    const outputs = response.outputs.map(o =>Output.fromJson(o))
    await this.saveTxExec(tx, outputs)
    return response
  }



  async createFundedTx(fn: CreateTxCallback): Promise<Tx> {
    return await this.client.createTx(async (builder, ref) => {
      await fn(builder, ref)
      await this.fundTx(builder)
      await this.signTx(builder)
    })
  }

}
