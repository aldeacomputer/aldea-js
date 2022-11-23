import { TxBuilder, Tx } from './internal.js'

export class Aldea {
  constructor(opts: any) {
    // noop
  }

  /**
   * Builds and returns a new Transaction. The given callback recieves the
   * TxBuilder instance.
   */
  createTx(builder: (tx: TxBuilder) => void): Tx {
    const txBuilder = new TxBuilder()
    builder(txBuilder)
    return txBuilder.tx
  }
}
