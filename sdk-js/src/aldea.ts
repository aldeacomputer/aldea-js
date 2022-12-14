import { Abi } from '@aldea/compiler/abi';
import ky from 'ky-universal'
import { CBOR } from 'cbor-redux'
import { InstructionRef, Output, TxBuilder, Tx, ref } from './internal.js'
import { MiniCache, createCache } from './support/cache.js'

/**
 * TODO
 */
export class Aldea {
  api: typeof ky;
  cache: MiniCache;

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
      parseJson: text => camelKeys(JSON.parse(text))
    })
    this.cache = createCache()
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
    const path = `tx/${txid}`
    return this.cache(path, () => this.api.get(path).json<TxResponse>())
  }

  async getRawTx(txid: string): Promise<Uint8Array> {
    const path = `rawtx/${txid}`
    return this.cache(path, async () => {
      const data = await this.api.get(path).arrayBuffer()
      return new Uint8Array(data)
    })
  }

  async getOutput(jigRef: string): Promise<OutputResponse> {
    const path = `output/${jigRef}`
    return this.cache(path, () => this.api.get(path).json<OutputResponse>())
  }

  getOutputById(jigId: string): Promise<OutputResponse> {
    return this.api.get(`output-by-id/${jigId}`).json()
  }

  async getPackageAbi(pkgId: string): Promise<Abi> {
    const path = `package/${pkgId}/abi.json`
    return this.cache(path, () => this.api.get(path).json<Abi>())
  }

  async getPackageSrc(pkgId: string): Promise<PackageResponse> {
    const path = `package/${pkgId}/source`
    return this.cache(path, async () => {
      const data = await this.api.get(`package/${pkgId}/source`).arrayBuffer()
      const seq = CBOR.decode(data, null, { mode: 'sequence' })
      return {
        entries: seq.get(1),
        files: seq.get(2),
        pkgId
      }
    })
  }

  async getPackageWasm(pkgId: string): Promise<Uint8Array> {
    const path = `package/${pkgId}/wasm`
    return this.cache(path, async () => {
      const data = await this.api.get(path).arrayBuffer()
      return new Uint8Array(data)
    })
  }

  async loadOutput(jigRef: string): Promise<Output> {
    const res = await this.getOutput(jigRef)
    const abi = await this.getPackageAbi(res.pkgId)
    return new Output(res, abi)
  }

  async loadOutputById(jigId: string): Promise<Output> {
    const res = await this.getOutputById(jigId)
    const abi = await this.getPackageAbi(res.pkgId)
    return new Output(res, abi)
  }
}

export interface TxResponse {
  txid: string;
  outputs: OutputResponse[];
  packages: PackageResponse[];
  rawTx?: string;
}

export interface OutputResponse {
  jigId: string;
  jigRef: string;
  pkgId: string;
  classIdx: number;
  lock: LockResponse;
  stateHex: string;
}

export interface PackageResponse {
  files: FileResponse[];
  entries: string[];
  pkgId: string;
}

export interface LockResponse {
  type: number;
  data: string
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
