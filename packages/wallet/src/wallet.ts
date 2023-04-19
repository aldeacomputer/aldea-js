import {
  CommitTxResponse,
  CreateTxCallback,
  Output,
  TxBuilder,
  Tx, Address
} from "@aldea/sdk-js"

export interface Wallet {
  getNextAddress(): Promise<Address>

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