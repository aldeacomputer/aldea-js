import fs from 'fs'

/**
 * Very simply mock class for setting up mocks on the API client
 */
class MiniMocker {
  constructor() {
    this.mocks = []
  }

  get(url, response) {
    this.mocks.push({ method: 'GET', url, response })
  }

  post(url, response) {
    this.mocks.push({ method: 'POST', url, response })
  }

  getHooks() {
    return this.mocks.map(m => {
      return req => {
        if (req.method === m.method && req.url === m.url) {
          let body = m.response.body
          if (m.response.json) body = JSON.stringify(m.response.json)
          if (m.response.file) body = fs.readFileSync(m.response.file)
          if (m.response.format === 'string') {
            body = body.toString()
            if (typeof body !== 'string') throw new Error('invalid mock response')
          }
          return new Response(body, { status: m.response.status || 200 })
        }
      }
    })
  }
}

export function mockAldea(aldea, callback) {
  const mock = new MiniMocker()
  callback(mock)
  const hooks = { beforeRequest: mock.getHooks() }
  aldea.api = aldea.api.extend({ hooks })
}
