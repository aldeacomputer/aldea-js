import {CommitTxResponse, CreateTxCallback} from "../aldea.js"
import {Output} from "../output.js"
import {TxBuilder} from "../tx-builder.js"
import {Tx} from "../tx.js";

export interface Wallet {
  getInventory(): Promise<Array<Output>>

  fundTx(partialTx: TxBuilder): Promise<TxBuilder>

  signTx(partialTx: TxBuilder): Promise<TxBuilder>

  processTx(tx: Tx, outputList: Output[]): Promise<void>

  addOutput(output: Output): Promise<void>

  fundSignAndBroadcastTx(fn: CreateTxCallback): Promise<CommitTxResponse>

  sync(): Promise<void>
}

export interface OwnedOutput {
  output: Output
  path: string
}
