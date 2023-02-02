import test from 'ava'
import { mockAldea  } from './test-helpers.js'
import {
  Aldea,
  Address,
  KeyPair,
  OpCode,
  Output,
  Pointer,
  Tx,
  base16,
} from '../dist/aldea.bundle.mjs'

test('Builds a tx with every opcode and encodes/decodes consistently', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701/abi.json', { file: 'test/mocks/txb.pkg.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json', { file: 'test/mocks/pkg.coin.json', format: 'string' })
    mock.get('http://localhost/output/df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d', { file: 'test/mocks/txb.coin.json', format: 'string' })
    mock.get('http://localhost/output-by-origin/675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1', { file: 'test/mocks/txb.jig.json', format: 'string' })
  })

  const keys = KeyPair.fromRandom()
  const addr = Address.fromPubKey(keys.pubKey)

  const pkg = new Map([
    ['index.ts', 'export function helloWorld(msg: string): string { return `Hello ${msg}!` }']
  ])

  const pkgId = 'a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701'
  const coinId = 'df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d'
  const jigOrigin = '675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1'

  const tx1 = await aldea.createTx((tx, ref) => {
    tx.import(pkgId)
    tx.load(coinId)
    tx.loadByOrigin(jigOrigin)
  
    tx.new(ref(0), 'Badge', ['foo'])
    tx.call(ref(1), 'send', [700, addr.hash])
    tx.call(ref(2), 'rename', ['bar'])
    tx.exec(ref(0), 'Badge.helloWorld', ['mum'])
    tx.exec(ref(0), 'helloWorld', ['dad'])
  
    tx.fund(ref(1))
    tx.lock(ref(2), addr)
    tx.lock(ref(3), addr)
    
    tx.deploy(pkg)
    
    tx.sign(keys.privKey)
    tx.signTo(keys.privKey)
  })
  
  const tx2 = Tx.fromHex(tx1.toHex())
  t.true(tx1 instanceof Tx)
  t.true(tx2 instanceof Tx)

  t.is(tx2.instructions.length, 14)
  t.is(tx2.instructions[0].opcode, OpCode.IMPORT)
  t.deepEqual(tx2.instructions[0].pkgId, base16.decode(pkgId))

  t.is(tx2.instructions[1].opcode, OpCode.LOAD)
  t.deepEqual(tx2.instructions[1].outputId, base16.decode(coinId))

  t.is(tx2.instructions[2].opcode, OpCode.LOADBYORIGIN)
  t.deepEqual(tx2.instructions[2].origin, Pointer.fromString(jigOrigin).toBytes())

  t.is(tx2.instructions[3].opcode, OpCode.NEW)
  t.is(tx2.instructions[3].idx, 0)
  t.is(tx2.instructions[3].exportIdx, 0)
  t.deepEqual(tx2.instructions[3].args, ['foo'])

  t.is(tx2.instructions[4].opcode, OpCode.CALL)
  t.is(tx2.instructions[4].idx, 1)
  t.is(tx2.instructions[4].methodIdx, 1)
  t.deepEqual(tx2.instructions[4].args, [700, addr.hash])

  t.is(tx2.instructions[5].opcode, OpCode.CALL)
  t.is(tx2.instructions[5].idx, 2)
  t.is(tx2.instructions[5].methodIdx, 1)
  t.deepEqual(tx2.instructions[5].args, ['bar'])

  t.is(tx2.instructions[6].opcode, OpCode.EXEC)
  t.is(tx2.instructions[6].idx, 0)
  t.is(tx2.instructions[6].exportIdx, 0)
  t.is(tx2.instructions[6].methodIdx, 2)
  t.deepEqual(tx2.instructions[6].args, ['mum'])

  t.is(tx2.instructions[7].opcode, OpCode.EXECFUNC)
  t.is(tx2.instructions[7].idx, 0)
  t.is(tx2.instructions[7].exportIdx, 1)
  t.deepEqual(tx2.instructions[7].args, ['dad'])

  t.is(tx2.instructions[8].opcode, OpCode.FUND)
  t.is(tx2.instructions[8].idx, 1)

  t.is(tx2.instructions[9].opcode, OpCode.LOCK)
  t.is(tx2.instructions[9].idx, 2)
  t.deepEqual(tx2.instructions[9].pubkeyHash, addr.hash)

  t.is(tx2.instructions[10].opcode, OpCode.LOCK)
  t.is(tx2.instructions[10].idx, 3)
  t.deepEqual(tx2.instructions[10].pubkeyHash, addr.hash)

  t.is(tx2.instructions[11].opcode, OpCode.DEPLOY)
  t.deepEqual(tx2.instructions[11].entry, ['index.ts'])
  t.deepEqual(tx2.instructions[11].code, pkg)

  t.is(tx2.instructions[12].opcode, OpCode.SIGN)
  t.is(tx2.instructions[12].sig.length, 64)
  t.deepEqual(tx2.instructions[12].pubkey, keys.pubKey.toBytes())

  t.is(tx2.instructions[13].opcode, OpCode.SIGNTO)
  t.is(tx2.instructions[13].sig.length, 64)
  t.deepEqual(tx2.instructions[13].pubkey, keys.pubKey.toBytes())
})

test('Aldea.commitTx() returns a created TX object', async t => {
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/tx/xxx', { file: 'test/mocks/tx.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getTx('xxx'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown tx:/)
})

test('Aldea.getRawTx() returns a TX binary if exists', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/rawtx/b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551', { file: 'test/mocks/tx.get.raw' })
  })
  const res = await aldea.getRawTx('b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551')
  t.true(res instanceof Uint8Array)
})

test('Aldea.getRawTx() throws error if notfound', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/rawtx/xxx', { file: 'test/mocks/tx.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getRawTx('xxx'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown tx:/)
})

test('Aldea.getOutput() returns an Output json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/0000', { file: 'test/mocks/output.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getOutput('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /not found/)
})

test('Aldea.getOutputByOrigin() returns an Output json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output-by-origin/0000_0', { file: 'test/mocks/output.400.json', format: 'string', status: 400 })
  })
  const err = await t.throwsAsync(() => aldea.getOutputByOrigin('0000_0'))
  const body = await err.response.json()
  t.is(err.response.status, 400)
  t.regex(body.message, /^invalid pointer/)
})

test('Aldea.getPackageAbi() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/abi.json', { file: 'test/mocks/pkg.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageAbi('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.getPackageSrc() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798/source', { file: 'test/mocks/pkg.get.cbor' })
  })
  const res = await aldea.getPackageSrc('c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798')
  t.true(typeof res.id === 'string')
  t.true(Array.isArray(res.entries))
  t.true('files' in res)
})

test('Aldea.getPackageSrc() throws error if notfound', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/source', { file: 'test/mocks/pkg.404.json', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageSrc('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.getPackageWasm() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798/wasm', { file: 'test/mocks/pkg.get.wasm' })
  })
  const res = await aldea.getPackageWasm('c39c3547d5882c2a1b2bdd2e692fe528a3ab907028e322616671961c0461f798')
  t.true(res instanceof Uint8Array)
})

test('Aldea.getPackageWasm() throws error if notfound', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/wasm', { file: 'test/mocks/pkg.404.json', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageWasm('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.loadOutput() returns an Output json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
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
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/0000', { file: 'test/mocks/output.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.loadOutput('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /not found/)
})

test('Aldea.loadOutput() throws error if invalid ID', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output/ff283ad569e6ddc4b0ba9b18f70600d14183a0bfd9d3d14f20c4e366b453bbee', { file: 'test/mocks/output.invalid.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json', { file: 'test/mocks/pkg.coin.json', format: 'string' })
  })
  const err = await t.throwsAsync(() => aldea.loadOutput('ff283ad569e6ddc4b0ba9b18f70600d14183a0bfd9d3d14f20c4e366b453bbee'))
  t.regex(err.message, /^invalid id/)
})
