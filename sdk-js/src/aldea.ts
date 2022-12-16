import { Abi } from '@aldea/compiler/abi';
import ky, { AfterResponseHook, BeforeRequestHook } from 'ky-universal'
import { CBOR } from 'cbor-redux'
import {
  ref,
  InstructionRef,
  Output,
  Pointer,
  Tx,
  TxBuilder,
} from './internal.js'

/**
 * TODO
 */
export class Aldea {
  api: typeof ky;
  cache = new Map<string, Response>();

  constructor(host: string, port?: number, protocol: string = 'http', base: string = '') {
    let url: string = `${protocol}://${host}`

    if (typeof port === 'number' && port !== 80) {
      url = `${url}:${port}`
    }
    if (typeof base === 'string' && base.length) {
      url = join(url, base)
    }

    this.api = ky.create({
      prefixUrl: url,
      parseJson: text => camelKeys(JSON.parse(text)),
      hooks: {
        beforeRequest: [ cacheGetter.bind(this) ],
        afterResponse: [ cacheSetter.bind(this) ],
      },
    })
  }

  /**
   * Builds and returns a new Transaction. The given callback recieves the
   * TxBuilder instance.
   */
  async createTx(builder: (tx: TxBuilder, ref: (idx: number) => InstructionRef) => void): Promise<Tx> {
    const txBuilder = new TxBuilder(this)
    builder(txBuilder, ref)
    return txBuilder.build()
  }

  async commitTx(tx: Tx): Promise<TxResponse> {
    const headers = { 'content-type': 'application/octet-stream' }
    const body = tx.toBytes()
    return this.api.post('tx', { headers, body }).json()
  }

  async getTx(txid: string): Promise<TxResponse> {
    return this.api.get(`tx/${txid}`).json<TxResponse>()
  }

  async getRawTx(txid: string): Promise<Uint8Array> {
    const data = await this.api.get(`rawtx/${txid}`).arrayBuffer()
    return new Uint8Array(data)
  }

  async getOutput(outputId: string): Promise<OutputResponse> {
    return this.api.get(`output/${outputId}`).json()
  }

  getOutputByOrigin(origin: string): Promise<OutputResponse> {
    return this.api.get(`output-by-id/${origin}`, { cache: 'no-cache' }).json()
  }

  async getPackageAbi(pkgId: string): Promise<Abi> {
    return this.api.get(`package/${pkgId}/abi.json`).json()
  }

  async getPackageSrc(pkgId: string): Promise<PackageResponse> {
    const data = await this.api.get(`package/${pkgId}/source`).arrayBuffer()
    const seq = CBOR.decode(data, null, { mode: 'sequence' })
    return {
      id: pkgId,
      entries: seq.get(1),
      files: seq.get(2),
    }
  }

  async getPackageWasm(pkgId: string): Promise<Uint8Array> {
    const data = await this.api.get(`package/${pkgId}/wasm`).arrayBuffer()
    return new Uint8Array(data)
  }

  async loadOutput(outputId: string): Promise<Output> {
    const res = await this.getOutput(outputId)
    const pkgPtr = Pointer.fromString(res.class)
    const abi = await this.getPackageAbi(pkgPtr.id)
    return Output.fromJson(res, abi)
  }

  async loadOutputByOrigin(origin: string): Promise<Output> {
    const res = await this.getOutputByOrigin(origin)
    const pkgPtr = Pointer.fromString(res.class)
    const abi = await this.getPackageAbi(pkgPtr.id)
    return Output.fromJson(res, abi)
  }
}

export interface TxResponse {
  id: string;                       // <- id's are always just "id" when contained in the thing it identifies
  outputs: OutputResponse[];
  packages: PackageResponse[];
  rawtx?: string;                   // <- avoid snake here
}

export interface OutputResponse {
  id: string;                       // <- just id
  origin: string;
  location: string;
  class: string;
  lock: LockResponse;
  state: string;                    // <- no need for _hex here. pretty much everything is hex
}

export interface PackageResponse {
  id: string;                       // <- just id
  entries: string[];  
  files: FileResponse[];
}

export interface LockResponse {
  type: number;
  data: string;
}

export interface FileResponse {
  name: string;
  content: string;
}

type keyedObject = { [key: string]: any }

// TODO
function camelKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(camelKeys)

  return Object.entries(obj).reduce((obj: keyedObject, [key, val]: [string, any]) => {
    obj[camelize(key)] = camelKeys(val)
    return obj
  }, {})
}

// TODO
function camelize(str: string): string {
  return str.replace(/[_.-](\w|$)/g, function (_,x) {
    return x.toUpperCase();
  })
}

// TODO
function join(...parts: string[]) {
  return parts.map((part, i) => {
    if (i === 0) {
      return part.trim().replace(/[\/]*$/g, '')
    } else {
      return part.trim().replace(/(^[\/]*|[\/]*$)/g, '')
    }
  }).filter(x => x.length).join('/')
}

const cacheGetter: BeforeRequestHook = function(this: Aldea, req, _opts) {
  if (this.cache.has(req.url)) {
    return this.cache.get(req.url)
  }
}

const cacheSetter: AfterResponseHook = function(this: Aldea, req, _opts, res) {
  if (
    req.method === 'GET' && res.ok &&
    req.cache !== 'no-store' && req.cache !== 'no-cache'
  ) {
    this.cache.set(req.url, res)
  }
}
