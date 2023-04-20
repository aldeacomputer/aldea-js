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

  saveTxExec(tx: Tx, outputList: Output[]): Promise<void>

  commitTx(tx: Tx): Promise<CommitTxResponse>

  addUtxo(output: Output): Promise<void>

  createFundedTx(fn: CreateTxCallback): Promise<Tx>

  sync(): Promise<void>
}
