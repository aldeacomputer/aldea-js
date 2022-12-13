import fetch from 'cross-fetch'

const defaultHeaders: HeadersInit = {
  'content-type': 'application/json'
}

const defaultOpts: RequestInit = {
  mode: 'no-cors'
}

/**
 * TODO
 * Possibly we use out own API client instead of ky
 * A decision for the future....
 */
export class Api {
  url: string;

  constructor(host: string, port?: number, protocol: string = 'https', base: string = '') {
    let url: string = `${protocol}://${host}`

    if (typeof port === 'number' && port !== 80) {
      url = `${url}:${port}`
    }
    if (typeof base === 'string' && base.length) {
      url = join(url, base)
    }

    this.url = url
  }

  get<R>(path: string, headers: HeadersInit = {}): Promise<R> {
    return this.request<R>(path, { method: 'GET', headers })
  }

  post<R>(path: string, body: BodyInit, headers: HeadersInit = {}): Promise<R> {
    return this.request<R>(path, { method: 'POST', headers, body })
  }
  
  private async request<R>(path: string, options: RequestInit): Promise<R> {
    const headers: HeadersInit = { ...defaultHeaders, ...options.headers }
    const res = await fetch(join(this.url, path), { ...defaultOpts, ...options, headers })
    const body = await this.responseBody(res)

    if (res.status >= 400) {
      throw new ApiError(res, body)
    } else {
      return body
    }
  }

  private responseBody(res: Response): Promise<any> {
    console.log(res.url)
    const ctype = res.headers.get('content-type') || ''
    if (/^application\/json/.test(ctype)) {
      return res.json().then(camelKeys)
    } else if (/^application\/(cbor|cbor-seq|octet-stream|wasm)/.test(ctype)) {
      return res.arrayBuffer().then(buf => new Uint8Array(buf))
    } else {
      return res.text()
    }
  }
}

/**
 * TODO
 */
export class ApiError extends Error {
  response: Response;
  body: string | Uint8Array;

  constructor(response: Response, body: string | Uint8Array) {
    super('bad response from server')
    this.response = response
    this.body = body
  }
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
