import test from 'ava'
import { mockAldea } from './test-helpers.js'
import { Address, Aldea, base16, BCS, KeyPair, OpCode, Output, Pointer, PrivKey, Tx } from '../dist/index.js'
import { readFileSync } from 'fs'
import { abiFromJson, abiToBin } from "@aldea/core"

function decodeArgs(abi, name, buf) {
  return new BCS(abi).decode(name, buf)
}

function loadAbi(fileName) {
  const file = readFileSync(fileName)
  const abi = abiFromJson(file.toString())
  return Buffer.from(abiToBin(abi))
}

test('Builds a tx with every opcode and encodes/decodes consistently', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701/abi.bin', { body: loadAbi('test/mocks/txb.pkg.json'), format: 'bin' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.bin', { body: loadAbi('test/mocks/pkg.coin.json'), format: 'bin' })
    mock.get('http://localhost/output/df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d', { file: 'test/mocks/txb.coin.json', format: 'string' })
    mock.get('http://localhost/output-by-origin/675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1', { file: 'test/mocks/txb.jig.json', format: 'string' })
  })

  const keys = KeyPair.fromPrivKey(PrivKey.fromHex('c80775a751569651acbf2f0de2c30e93df3274bf92430fefb3b41e2f02f0e409'))
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
    tx.exec(ref(0), 'helloWorld', ['dad'])
  
    tx.fund(ref(1))
    tx.lock(ref(2), addr)
    tx.lock(ref(3), addr)
    
    tx.deploy(pkg)
    
    tx.sign(keys.privKey)
    tx.signTo(keys.privKey)
  })

  t.true(tx1.verify())

  const pkgAbi = await aldea.getPackageAbi(pkgId)
  const coinAbi = await aldea.getPackageAbi('0000000000000000000000000000000000000000000000000000000000000000')

  const tx2 = Tx.fromHex(tx1.toHex())
  t.true(tx1 instanceof Tx)
  t.true(tx2 instanceof Tx)

  t.is(tx2.instructions.length, 13)
  t.is(tx2.instructions[0].opcode, OpCode.IMPORT)
  t.deepEqual(tx2.instructions[0].pkgId, base16.decode(pkgId))

  t.is(tx2.instructions[1].opcode, OpCode.LOAD)
  t.deepEqual(tx2.instructions[1].outputId, base16.decode(coinId))

  t.is(tx2.instructions[2].opcode, OpCode.LOADBYORIGIN)
  t.deepEqual(tx2.instructions[2].origin, Pointer.fromString(jigOrigin).toBytes())

  t.is(tx2.instructions[3].opcode, OpCode.NEW)
  t.is(tx2.instructions[3].idx, 0)
  t.is(tx2.instructions[3].exportIdx, 0)
  t.deepEqual(decodeArgs(pkgAbi, 'Badge_constructor', tx2.instructions[3].argsBuf), ['foo'])

  t.is(tx2.instructions[4].opcode, OpCode.CALL)
  t.is(tx2.instructions[4].idx, 1)
  t.is(tx2.instructions[4].methodIdx, 0)
  t.deepEqual(decodeArgs(coinAbi, 'Coin_send', tx2.instructions[4].argsBuf), [700n, addr.hash])

  t.is(tx2.instructions[5].opcode, OpCode.CALL)
  t.is(tx2.instructions[5].idx, 2)
  t.is(tx2.instructions[5].methodIdx, 0)
  t.deepEqual(decodeArgs(pkgAbi, 'Badge_rename', tx2.instructions[5].argsBuf), ['bar'])

  t.is(tx2.instructions[6].opcode, OpCode.EXEC)
  t.is(tx2.instructions[6].idx, 0)
  t.is(tx2.instructions[6].exportIdx, 1)
  t.deepEqual(decodeArgs(pkgAbi, 'helloWorld', tx2.instructions[6].argsBuf), ['dad'])

  t.is(tx2.instructions[7].opcode, OpCode.FUND)
  t.is(tx2.instructions[7].idx, 1)

  t.is(tx2.instructions[8].opcode, OpCode.LOCK)
  t.is(tx2.instructions[8].idx, 2)
  t.deepEqual(tx2.instructions[9].pubkeyHash, addr.hash)

  t.is(tx2.instructions[9].opcode, OpCode.LOCK)
  t.is(tx2.instructions[9].idx, 3)
  t.deepEqual(tx2.instructions[9].pubkeyHash, addr.hash)

  t.is(tx2.instructions[10].opcode, OpCode.DEPLOY)
  t.deepEqual(BCS.pkg.decode(tx2.instructions[10].pkgBuf), [['index.ts'], pkg])

  t.is(tx2.instructions[11].opcode, OpCode.SIGN)
  t.is(tx2.instructions[11].sig.length, 64)
  t.deepEqual(tx2.instructions[11].pubkey, keys.pubKey.toBytes())

  t.is(tx2.instructions[12].opcode, OpCode.SIGNTO)
  t.is(tx2.instructions[12].sig.length, 64)
  t.deepEqual(tx2.instructions[12].pubkey, keys.pubKey.toBytes())

  t.true(tx2.verify())
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
    mock.get('http://localhost/output/eb1a5706276e030e0518ab4b09e11bf0f30e195b31634abc4eeb2c9e3657ebaa', { file: 'test/mocks/output.get.json', format: 'string' })
  })
  const res = await aldea.getOutput('eb1a5706276e030e0518ab4b09e11bf0f30e195b31634abc4eeb2c9e3657ebaa')
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
    mock.get('http://localhost/output-by-origin/eb1a5706276e030e0518ab4b09e11bf0f30e195b31634abc4eeb2c9e3657ebaa', { file: 'test/mocks/output.get.json', format: 'string' })
  })
  const res = await aldea.getOutputByOrigin('eb1a5706276e030e0518ab4b09e11bf0f30e195b31634abc4eeb2c9e3657ebaa')
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
    mock.get('http://localhost/package/29a2a5a72ae09bab014063c32b740478c8619cfd639277f931af7937a7bbee69/abi.bin', { body: loadAbi('test/mocks/pkg.get.json'), format: 'bin' })
  })
  const res = await aldea.getPackageAbi('29a2a5a72ae09bab014063c32b740478c8619cfd639277f931af7937a7bbee69')
  t.true(typeof res.version === 'number')
  t.true(Array.isArray(res.exports) && res.exports.every(n => typeof n === 'number'))
  t.true(Array.isArray(res.imports) && res.imports.every(n => typeof n === 'number'))
  t.true(Array.isArray(res.defs))
  t.true('typeIds' in res)
})

test('Aldea.getPackageAbi() throws error if notfound', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/0000/abi.bin', { file: 'test/mocks/pkg.404.json', format: 'string', status: 404 })
  })
  const err = await t.throwsAsync(() => aldea.getPackageAbi('0000'))
  const body = await err.response.json()
  t.is(err.response.status, 404)
  t.regex(body.message, /^unknown module/)
})

test('Aldea.getPackageSrc() returns an ABI json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/29a2a5a72ae09bab014063c32b740478c8619cfd639277f931af7937a7bbee69/source', { file: 'test/mocks/pkg.get.bin' })
  })
  const res = await aldea.getPackageSrc('29a2a5a72ae09bab014063c32b740478c8619cfd639277f931af7937a7bbee69')
  t.true(typeof res.id === 'string')
  t.true(Array.isArray(res.entries))
  t.true(Array.isArray(res.files))
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
    mock.get('http://localhost/package/29a2a5a72ae09bab014063c32b740478c8619cfd639277f931af7937a7bbee69/wasm', { file: 'test/mocks/pkg.get.wasm' })
  })
  const res = await aldea.getPackageWasm('29a2a5a72ae09bab014063c32b740478c8619cfd639277f931af7937a7bbee69')
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
    mock.get('http://localhost/output/eb1a5706276e030e0518ab4b09e11bf0f30e195b31634abc4eeb2c9e3657ebaa', { file: 'test/mocks/output.get.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.bin', { body: loadAbi('test/mocks/pkg.coin.json'), format: 'string' })
  })
  const res = await aldea.loadOutput('eb1a5706276e030e0518ab4b09e11bf0f30e195b31634abc4eeb2c9e3657ebaa')
  t.true(res instanceof Output)
  t.true(typeof res.props === 'object')
  t.true(typeof res.props.amount === 'bigint')
})

test('Aldea.loadOutputByOrigin() returns an Output json object if exists', async t => {
  const aldea = new Aldea('http://localhost')
  mockAldea(aldea, mock => {
    mock.get('http://localhost/output-by-origin/b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551_1', { file: 'test/mocks/output.get.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.bin', { body: loadAbi('test/mocks/pkg.coin.json') , format: 'bin' })
  })
  const res = await aldea.loadOutputByOrigin('b010448235a7b4ab082435b9c497ba38e8b85e5c0717b91b5b3ae9c1e10b7551_1')
  t.true(res instanceof Output)
  t.true(typeof res.props === 'object')
  t.true(typeof res.props.amount === 'bigint')
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
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.bin', { body: loadAbi('test/mocks/pkg.coin.json'), format: 'bin' })
  })
  const err = await t.throwsAsync(() => aldea.loadOutput('ff283ad569e6ddc4b0ba9b18f70600d14183a0bfd9d3d14f20c4e366b453bbee'))
  t.regex(err.message, /^invalid id/)
})
