//import ky from 'ky'
import ky from 'ky-universal'
import { TxBuilder, Tx, TxOut } from './internal.js'

/**
 * TODO
 */
export class Aldea {
  api: typeof ky;

  constructor(opts: any) {
    this.api = ky.create({
      prefixUrl: 'http://localhost:4000',
      cache: 'force-cache'
    })
  }

  /**
   * TODO
   */
  async commit(tx: Tx): Promise<TxResponse> {
    const body = tx.toBytes()
    return ky.post('/tx', { body }).json<TxResponse>()
  }

  /**
   * TODO
   */
  async loadOutput(ref: string): Promise<TxOut> {
    const outputJson = await ky.get(`state/${ ref }`).json<TxOutResponse>()
    return TxOut.fromJson(outputJson)
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

/**
 * TODO
 */
export interface TxResponse {
  txid: string;
  outputs: TxOutResponse[];
  packages: TxPkgResponse[];
  tx?: string;
}

/**
 * TODO
 */
export interface TxOutResponse {
  jig_id: string;
  jig_ref: string;
  pkg_id: string;
  class_id: string;
  lock: { type: number, data: string };
  state: string;
}

/**
 * TODO
 */
export interface TxPkgResponse {
  pkg_id: string;
  files: string[];
  entries: string[];
}
