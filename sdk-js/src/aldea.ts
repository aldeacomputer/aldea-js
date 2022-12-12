//import ky from 'ky'
import ky from 'ky-universal'
import { Abi } from '@aldea/compiler/abi'
import { TxBuilder, Tx } from './internal.js'

/**
 * TODO
 */
export class Aldea {
  api: typeof ky;

  constructor(opts: any) {
    this.api = ky.create({
      prefixUrl: 'https://node.aldea.computer'
    })
  }

  /**
   * TODO
   */
  async commit(tx: Tx): Promise<TxResponse> {
    const headers = { 'content-type': 'application/octet-stream' }
    const body = tx.toBytes()
    return this.api.post('tx', { headers, body }).json<TxResponse>()
  }

  /**
   * TODO
   */
  async getOutput(jigRef: string): Promise<TxOutResponse> {
    return await this.api.get(`output/${ jigRef }`).json<TxOutResponse>()
  }

  /**
   * TODO
   */
  async getOutputByOrigin(origin: string): Promise<TxOutResponse> {
    return await this.api.get(`output-by-origin/${ origin }`).json<TxOutResponse>()
  }

  /**
   * TODO
   */
   async getPackage(pkgId: string): Promise<Abi> {
    return await this.api.get(`package/${ pkgId }/abi.json`).json<Abi>()
  }

  /**
   * Builds and returns a new Transaction. The given callback recieves the
   * TxBuilder instance.
   */
  createTx(builder: (tx: TxBuilder) => void): Promise<Tx> {
    const txBuilder = new TxBuilder(this)
    builder(txBuilder)
    return txBuilder.build()
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
  class_idx: number;
  lock: { type: number, data: string };
  state_hex: string;
}

/**
 * TODO
 */
export interface TxPkgResponse {
  pkg_id: string;
  files: string[];
  entries: string[];
}
