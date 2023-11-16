import { LoadByOriginInstruction, LoadInstruction } from "@aldea/core/instructions";
import {
  Address,
  CommitTxResponse,
  CreateTxCallback,
  HDPrivKey,
  OpCode,
  Output,
  Pointer,
  PrivKey,
  Tx,
  TxBuilderOpts, 
  base16, 
} from "@aldea/sdk"

import {COIN_CLASS_PTR} from "./constants.js";
import {AldeaClient} from "./aldea-client.js";


export abstract class Wallet {
  protected client: AldeaClient
  constructor (client: AldeaClient) {
    this.client = client
  }

  abstract getNextAddress(): Promise<Address>
  abstract getInventory(): Promise<Array<Output>>
  abstract signTx(partialTx: Tx, updateSigs?: PrivKey | HDPrivKey | Array<PrivKey | HDPrivKey>): Promise<Tx>
  abstract saveTxExec(tx: Tx, outputList: Output[]): Promise<void>
  abstract addUtxo(output: Output): Promise<void>
  abstract sync(): Promise<void>

  async fundTx(partialTx: Tx): Promise<Tx> {
    const outputs = await this.getInventory()
    const coinOutputs = outputs.filter(o => {
      return o.classPtr.equals(COIN_CLASS_PTR) && !partialTx.instructions.some(i => {
        return (
          i.opcode === OpCode.LOAD && o.id === base16.encode((<LoadInstruction>i).outputId)
        ) || (
          i.opcode === OpCode.LOADBYORIGIN && o.origin.equals(Pointer.fromBytes((<LoadByOriginInstruction>i).origin))
        )
      })
    })

    return await this.client.createTx({ extend: partialTx }, async (txb) => {
      let motosIn = 0n

      for (const coin of coinOutputs) {
        if (coin.props?.amount) {
          const coinRef = txb.load(coin.id)
          motosIn += coin.props.amount

          if (motosIn > 100n) {
            const changeAddr = await this.getNextAddress()
            const changeRef = txb.call(coinRef, 'send', [motosIn - 100n])
            txb.lock(changeRef, changeAddr)
            motosIn = 100n
          }
          txb.fund(coinRef)
        }  
  
        if (motosIn === 100n) {
          break
        }
      }
    })
  }

  async commitTx(tx: Tx): Promise<CommitTxResponse> {
    const response = await this.client.commitTx(tx)
    const outputs = response.outputs.map(o =>Output.fromJson(o))
    await this.saveTxExec(tx, outputs)
    return response
  }

  async createFundedTx(builder: CreateTxCallback): Promise<Tx>;
  async createFundedTx(opts: TxBuilderOpts, builder: CreateTxCallback): Promise<Tx>;
  async createFundedTx(optsOrBuilder: TxBuilderOpts | CreateTxCallback, builder?: CreateTxCallback): Promise<Tx> {
    let opts: TxBuilderOpts
    if (typeof optsOrBuilder === 'function') {
      opts = {}
      builder = optsOrBuilder as CreateTxCallback
    } else {
      opts = optsOrBuilder
      builder = builder as CreateTxCallback
    }
    const userTx = await this.client.createTx(opts, builder)
    const fundedTx = await this.fundTx(userTx)
    return this.signTx(fundedTx, opts.updateSigs)
  }
}
