import ky, { AfterResponseHook, BeforeRequestHook } from 'ky-universal'
import { Abi } from './abi/types.js'

import {
  Address,
  BCS,
  InstructionRef,
  Output,
  Pointer,
  Tx,
  TxBuilder,
  ref,
} from './internal.js'


export type CreateTxCallback = (tx: TxBuilder, ref: (idx: number) => InstructionRef) => void | Promise<void>

/**
 * The Aldea class connects to a remote Aldea instance and provide a top-level
 * API for interacting with the Node, building and commiting new transactions.
 */
export class Aldea {
  api: typeof ky;
  cache = new Map<string, Response>();

  constructor(url: string) {
    this.api = ky.create({
      prefixUrl: new URL(url),
      hooks: {
        beforeRequest: [ cacheGetter.bind(this) ],
        afterResponse: [ cacheSetter.bind(this) ],
      },
    })
  }

  /**
   * Builds and returns a new Transaction. The given callback recieves the
   * TxBuilder instance and a `ref` function for turning integers into
   * Instruction references.
   */
  async createTx(builder: CreateTxCallback): Promise<Tx> {
    const txBuilder = new TxBuilder(this)
    await builder(txBuilder, ref)
    return txBuilder.build()
  }

  /**
   * Broadcasts the given transaction to the Aldea Computer and responds with
   * the full transaction execution result.
   */
  async commitTx(tx: Tx): Promise<CommitTxResponse> {
    const headers = { 'content-type': 'application/octet-stream' }
    const body = tx.toBytes()
    return this.api.post('tx', { headers, body }).json<CommitTxResponse>()
  }

  /**
   * Gets a transaction by its `txid` and responds with the full transaction
   * execution result.
   */
  async getTx(txid: string): Promise<CommitTxResponse> {
    return this.api.get(`tx/${txid}`).json<CommitTxResponse>()
  }

  /**
   * Gets a transaction by its `txid` and responds with the raw transaction
   * data.
   */
  async getRawTx(txid: string): Promise<Uint8Array> {
    const data = await this.api.get(`rawtx/${txid}`).arrayBuffer()
    return new Uint8Array(data)
  }

  /**
   * Gets an output by its output ID and responds with the transaction
   * execution output.
   */
  async getOutput(outputId: string): Promise<OutputResponse> {
    return this.api.get(`output/${outputId}`).json()
  }

  /**
   * Gets the most recent version of an output by its origin and responds with
   * the most transaction execution output.
   */
  getOutputByOrigin(origin: string): Promise<OutputResponse> {
    return this.api.get(`output-by-origin/${origin}`, { cache: 'no-cache' }).json()
  }

  /**
   * Returns every output in the otxo locked by the given address
   * @param address
   */
  async getUtxosByAddress(address: Address): Promise<Output[]> {
    const outputs: OutputResponse[] = await this.api.get(`utxos-by-address/${address.toString()}`, { cache: 'no-cache' }).json()
    return Promise.all(outputs.map(async o => {
      const abi = await this.getPackageAbi(Pointer.fromString(o.class).id)
      return Output.fromJson(o, abi)
    }))
  }

  /**
   * Gets a package by its ID and responds with the ABI in JSON format.
   */
  async getPackageAbi(pkgId: string): Promise<Abi> {
    return this.api.get(`package/${pkgId}/abi.json`).json()
  }

  /**
   * Gets a package by its ID and responds with the package source files.
   */
  async getPackageSrc(pkgId: string): Promise<PackageResponse> {
    const bcs = new BCS({ addPkgTypes: true })
    const buf = await this.api.get(`package/${pkgId}/source`).arrayBuffer()
    const [entries, files] = bcs.decode('pkg', new Uint8Array(buf))
    return {
      id: pkgId,
      entries,
      files,
    }
  }

  /**
   * Gets a package by its ID and responds with the compiled WASM module.
   */
  async getPackageWasm(pkgId: string): Promise<Uint8Array> {
    const data = await this.api.get(`package/${pkgId}/wasm`).arrayBuffer()
    return new Uint8Array(data)
  }

  /**
   * Loads an output by its output ID and responds with a generic Output object
   * with its state parsed as an object.
   */
  async loadOutput(outputId: string): Promise<Output> {
    const res = await this.getOutput(outputId)
    const pkgPtr = Pointer.fromString(res.class)
    const abi = await this.getPackageAbi(pkgPtr.id)
    return Output.fromJson(res, abi)
  }

  /**
   * Gets the most recent version of an output by its origin and responds with a
   * generic Output object with its state parsed as an object.
   */
  async loadOutputByOrigin(origin: string): Promise<Output> {
    const res = await this.getOutputByOrigin(origin)
    const pkgPtr = Pointer.fromString(res.class)
    const abi = await this.getPackageAbi(pkgPtr.id)
    return Output.fromJson(res, abi)
  }
}

/**
 * HTTP Transaction Execution Response
 */
export interface CommitTxResponse {
  id: string;
  outputs: OutputResponse[];
  packages: PackageResponse[];
  rawtx?: string;
}

/**
 * HTTP Output Response
 */
export interface OutputResponse {
  id: string;
  origin: string;
  location: string;
  class: string;
  lock: LockResponse;
  state: string;
}

/**
 * HTTP Output Response Lock Data
 */
export interface LockResponse {
  type: number;
  data: string;
}

/**
 * HTTP Package Response
 */
export interface PackageResponse {
  id: string;
  entries: string[];  
  files: FileResponse[];
}

/**
 * HTTP Package Response File Data
 */
export interface FileResponse {
  name: string;
  content: string;
}

// Concatenates path parts into a string
function join(...parts: string[]) {
  return parts.map((part, i) => {
    if (i === 0) {
      return part.trim().replace(/[\/]*$/g, '')
    } else {
      return part.trim().replace(/(^[\/]*|[\/]*$)/g, '')
    }
  }).filter(x => x.length).join('/')
}

// Before filter checks if the request has a cached response
const cacheGetter: BeforeRequestHook = function(this: Aldea, req, _opts) {
  if (this.cache.has(req.url)) {
    return this.cache.get(req.url)
  }
}

// After filter caches GET responses unless headers say no
const cacheSetter: AfterResponseHook = function(this: Aldea, req, _opts, res) {
  if (
    req.method === 'GET' && res.ok &&
    req.cache !== 'no-store' && req.cache !== 'no-cache'
  ) {
    this.cache.set(req.url, res)
  }
}
