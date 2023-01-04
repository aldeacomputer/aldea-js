import test from 'ava'
import { mockAldea  } from './test-helpers.js'
import { Aldea, Output, Tx } from '../dist/aldea.bundle.mjs'

test('Aldea.commitTx() returns a created TX object', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.post('http://localhost/tx', { file: 'test/mocks/tx.post.json', format: 'string' })
  })
  // The request is mocked so we'll pass any old tx
  const res = await aldea.commitTx(new Tx())
  t.true(typeof res.id === 'string')
  t.true(typeof res.rawtx === 'string')
  t.true(Array.isArray(res.outputs))
  t.true(Array.isArray(res.packages))
})

test('Aldea.commitTx() throws error with bad Tx', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.post('http://localhost/tx', { file: 'test/mocks/tx.400.json', format: 'string', status: 400 })
  })
  // The request is mocked so we'll pass any old tx
  const err = await t.throwsAsync(() => aldea.commitTx(new Tx()))
  const body = await err.response.json()
  t.is(err.response.status, 400)
  t.regex(body.message, /^tx not funded/)
})

test('Aldea.getTx() returns a TX object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/tx/b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551', { file: 'test/mocks/tx.get.json' })
  })
  const res = await aldea.getTx('b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551')
  t.true(typeof res.id === 'string')
  t.true(typeof res.rawtx === 'string')
  t.true(Array.isArray(res.outputs))
  t.true(Array.isArray(res.packages))
})

test('Aldea.getTx() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/tx/xxx', { file: 'test/mocks/tx.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getTx('xxx'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown tx:/)
})

test('Aldea.getRawTx() returns a TX binary if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/rawtx/b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551', { file: 'test/mocks/tx.get.raw' })
  })
  const res = await aldea.getRawTx('b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551')
  t.true(res instanceof Uint8Array)
})

test('Aldea.getRawTx() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/rawtx/xxx', { file: 'test/mocks/tx.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getRawTx('xxx'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown tx:/)
})

test('Aldea.getOutput() returns an Output json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/1f283ad569e6ddc4b0ba9b18f70692d14183a0bfd9d3d14f20c4e366b453bb7f', { file: 'test/mocks/output.get.json', format: 'string' })
  })
  const res = await aldea.getOutput('1f283ad569e6ddc4b0ba9b18f70692d14183a0bfd9d3d14f20c4e366b453bb7f')
  t.true(typeof res.id === 'string')
  t.true(typeof res.origin === 'string')
  t.true(typeof res.location === 'string')
  t.true(typeof res.class === 'string')
  t.true(typeof res.state === 'string')
  t.true('lock' in res)
})

test('Aldea.getOutput() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/0000', { file: 'test/mocks/output.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getOutput('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /not found/)
})

test('Aldea.getOutputByOrigin() returns an Output json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output-by-origin/1f283ad569e6ddc4b0ba9b18f70692d14183a0bfd9d3d14f20c4e366b453bb7f', { file: 'test/mocks/output.get.json', format: 'string' })
  })
  const res = await aldea.getOutputByOrigin('1f283ad569e6ddc4b0ba9b18f70692d14183a0bfd9d3d14f20c4e366b453bb7f')
  t.true(typeof res.id === 'string')
  t.true(typeof res.origin === 'string')
  t.true(typeof res.location === 'string')
  t.true(typeof res.class === 'string')
  t.true(typeof res.state === 'string')
  t.true('lock' in res)
})

test('Aldea.getOutputByOrigin() throws error if invalid pointer', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output-by-origin/0000_0', { file: 'test/mocks/output.400.json', format: 'string', status: 400 })
  })
  const err = await t.throwsAsync(() => aldea.getOutputByOrigin('0000_0'))
  const body = await err.response.json()
  t.is(err.response.status, 400)
  t.regex(body.message, /^invalid pointer/)
})

test('Aldea.getPackageAbi() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798/abi.json', { file: 'test/mocks/pkg.get.json', format: 'string' })
  })
  const res = await aldea.getPackageAbi('c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798')
  t.true(typeof res.version === 'number')
  t.true(Array.isArray(res.exports))
  t.true(Array.isArray(res.imports))
  t.true(Array.isArray(res.objects))
  t.true('typeIds' in res)
})

test('Aldea.getPackageAbi() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/abi.json', { file: 'test/mocks/pkg.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageAbi('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.getPackageSrc() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798/source', { file: 'test/mocks/pkg.get.cbor' })
  })
  const res = await aldea.getPackageSrc('c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798')
  t.true(typeof res.id === 'string')
  t.true(Array.isArray(res.entries))
  t.true('files' in res)
})

test('Aldea.getPackageSrc() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/source', { file: 'test/mocks/pkg.404.json', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageSrc('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.getPackageWasm() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798/wasm', { file: 'test/mocks/pkg.get.wasm' })
  })
  const res = await aldea.getPackageWasm('c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798')
  t.true(res instanceof Uint8Array)
})

test('Aldea.getPackageWasm() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/wasm', { file: 'test/mocks/pkg.404.json', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageWasm('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.loadOutput() returns an Output json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/1f283ad569e6ddc4b0ba9b18f70692d14183a0bfd9d3d14f20c4e366b453bb7f', { file: 'test/mocks/output.get.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json', { file: 'test/mocks/pkg.coin.json', format: 'string' })
  })
  const res = await aldea.loadOutput('1f283ad569e6ddc4b0ba9b18f70692d14183a0bfd9d3d14f20c4e366b453bb7f')
  t.true(res instanceof Output)
  t.true(typeof res.props === 'object')
  t.true(typeof res.props.motos === 'number')
})

test('Aldea.loadOutputByOrigin() returns an Output json object if exists', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output-by-origin/b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551_1', { file: 'test/mocks/output.get.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json', { file: 'test/mocks/pkg.coin.json', format: 'string' })
  })
  const res = await aldea.loadOutputByOrigin('b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551_1')
  t.true(res instanceof Output)
  t.true(typeof res.props === 'object')
  t.true(typeof res.props.motos === 'number')
})

test('Aldea.loadOutput() throws error if notfound', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/0000', { file: 'test/mocks/output.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.loadOutput('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /not found/)
})

test('Aldea.loadOutput() throws error if invalid ID', async t => {
  const aldea = new Aldea('localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/ff283ad569e6ddc4b0ba9b18f70600d14183a0bfd9d3d14f20c4e366b453bbee', { file: 'test/mocks/output.invalid.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json', { file: 'test/mocks/pkg.coin.json', format: 'string' })
  })
  const err = await t.throwsAsync(() => aldea.loadOutput('ff283ad569e6ddc4b0ba9b18f70600d14183a0bfd9d3d14f20c4e366b453bbee'))
  t.regex(err.message, /^invalid id/)
})
