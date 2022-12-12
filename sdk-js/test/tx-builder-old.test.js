import test from 'ava'
import crypto from 'crypto'
import { KeyPair, Address, Tx, OpCode } from '../dist/index.js'
import { TxBuilder } from '../dist/tx-builder-old.js'

function createTx(callback) {
  const builder = new TxBuilder()
  callback(builder)
  return builder.tx
}


test('builds a tx with every opcode and encodes/decodes consistently', t => {
  const origin1 = new Uint8Array(crypto.randomBytes(32))
  const origin2 = new Uint8Array(crypto.randomBytes(32))
  const location = new Uint8Array(crypto.randomBytes(32))
  const keys = KeyPair.fromRandom()
  const address = Address.fromPubKey(keys.pubKey)

  const tx1 = createTx(tx => {
    tx.import(origin1)
    tx.loadByRef(location)
    tx.loadById(origin2)
    tx.new(0, 0, [500, address.hash])
    tx.call(1, 1, [500, address.hash])
    tx.exec(2, 2, 2, [500, address.hash])
    tx.fund(1)
    tx.lock(0, address.hash)
    tx.sign(keys.privKey)
    tx.signTo(keys.privKey)
  })

  // Encode and decode to new TX
  const tx2 = Tx.fromHex(tx1.toHex())

  t.is(tx2.instructions.length, 10)

  t.is(tx2.instructions[0].opcode, OpCode.IMPORT)
  t.deepEqual(tx2.instructions[0].origin, origin1)

  t.is(tx2.instructions[1].opcode, OpCode.LOADBYREF)
  t.deepEqual(tx2.instructions[1].jigRef, location)

  t.is(tx2.instructions[2].opcode, OpCode.LOADBYID)
  t.deepEqual(tx2.instructions[2].jigId, origin2)

  t.is(tx2.instructions[3].opcode, OpCode.NEW)
  t.is(tx2.instructions[3].idx, 0)
  t.is(tx2.instructions[3].exportIdx, 0)
  t.deepEqual(tx2.instructions[3].args, [500, address.hash])

  t.is(tx2.instructions[4].opcode, OpCode.CALL)
  t.is(tx2.instructions[4].idx, 1)
  t.is(tx2.instructions[4].methodIdx, 1)
  t.deepEqual(tx2.instructions[4].args, [500, address.hash])

  t.is(tx2.instructions[5].opcode, OpCode.EXEC)
  t.is(tx2.instructions[5].idx, 2)
  t.is(tx2.instructions[5].exportIdx, 2)
  t.is(tx2.instructions[5].methodIdx, 2)
  t.deepEqual(tx2.instructions[5].args, [500, address.hash])

  t.is(tx2.instructions[6].opcode, OpCode.FUND)
  t.is(tx2.instructions[6].idx, 1)

  t.is(tx2.instructions[7].opcode, OpCode.LOCK)
  t.is(tx2.instructions[7].idx, 0)
  t.deepEqual(tx2.instructions[7].pubkeyHash, address.hash)

  t.is(tx2.instructions[8].opcode, OpCode.SIGN)
  t.is(tx2.instructions[8].sig.length, 64)
  t.deepEqual(tx2.instructions[8].pubkey, keys.pubKey.toBytes())

  t.is(tx2.instructions[9].opcode, OpCode.SIGNTO)
  t.is(tx2.instructions[9].sig.length, 64)
  t.deepEqual(tx2.instructions[9].pubkey, keys.pubKey.toBytes())
})

test('builds a deploy transaction', t => {
  const location = new Uint8Array(crypto.randomBytes(32))
  const keys = KeyPair.fromRandom()
  const address = Address.fromPubKey(keys.pubKey)

  const code = new Map()
  code.set('foo.ts', 'export function foo(): string { return "hello world" }')
  code.set('index.ts', `
    import { foo } from './foo.ts'
    export function bar(): string { return foo() }
  `)

  const tx1 = createTx(tx => {
    tx.loadByRef(location)
    tx.deploy(code)
    tx.call(0, 1, [500, address.hash])
    tx.fund(0)
    tx.sign(keys.privKey)
  })

  // Encode and decode to new TX
  const tx2 = Tx.fromHex(tx1.toHex())

  t.is(tx2.instructions.length, 5)
  t.is(tx2.instructions[1].opcode, OpCode.DEPLOY)
  t.deepEqual(tx2.instructions[1].code, code)
})

test('builds a tiny tx comparison to bitcoin', t => {
  const location = new Uint8Array(crypto.randomBytes(20))
  const keys = KeyPair.fromRandom()
  const address = Address.fromPubKey(keys.pubKey)

  const tx1 = createTx(tx => {
    tx.loadByRef(location)
    tx.call(0, 1, [500, address.hash])
    tx.fund(0)
    tx.sign(keys.privKey)
  })

  t.is(tx1.toBytes().length, 159)
  t.pass()
})
