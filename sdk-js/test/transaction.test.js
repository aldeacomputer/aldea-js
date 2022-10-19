import test from 'ava'
import {
  Transaction,
  CallInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  JigArg,
  StringArg,
  PrivKey,
  NumberArg,
  Signature
} from '../dist/index.js'

// test.before(t => {})

test('serialize for empy tx returns empty string', t => {
  const tx = new Transaction()
  t.true(tx.serialize() === '')
})

test('serialize return right string for only a load line', t => {
  const tx = new Transaction()
    .add(new LoadInstruction('someLocation', true))
  t.is(tx.serialize(), 'LOAD someLocation true')
})

test('serialize return right string for only a new line', t => {
  const tx = new Transaction()
    .add(new NewInstruction('somemodule', 'SomeClass', [new JigArg(1), new StringArg('foo')]))

  t.is(tx.serialize(), 'NEW somemodule SomeClass #1 "foo"')
})

test('serialize return right string for only a call instruction', t => {
  const tx = new Transaction()
    .add(new CallInstruction(1001, 'foo', [new JigArg(1), new StringArg('foo')]))
  t.is(tx.serialize(), 'CALL #1001 foo #1 "foo"')
})

test('serialize return corrent string for only a LockInstructon', t => {
  const pubkey = PrivKey.fromRandom().toPubKey()
  const tx = new Transaction()
    .add(new LockInstruction(0, pubkey))

  t.is(tx.serialize(), `LOCK #0 ${pubkey.toHex()}`)
})

test('serialize return corrent string for multiple instructions', t => {
  const pubkey = PrivKey.fromRandom().toPubKey()
  const tx = new Transaction()
    .add(new LoadInstruction('someLocation', true))
    .add(new NewInstruction('somemodule', 'SomeClass', [new JigArg(1), new StringArg('foo')]))
    .add(new CallInstruction(0, 'someMethod', [new JigArg(3), new NumberArg(10)]))
    .add(new LockInstruction(1, pubkey))

  t.is(tx.serialize(), [
    'LOAD someLocation true',
    'NEW somemodule SomeClass #1 "foo"',
    'CALL #0 someMethod #3 10',
    `LOCK #1 ${pubkey.toHex()}`
  ].join('\n'))
})


test('after sign is signed by a given signature', t => {
  const privKey = PrivKey.fromRandom()
  const pubkey = privKey.toPubKey()
  const tx = new Transaction()
    .add(new LoadInstruction('somelocation', true))
    .add(new LockInstruction(1, pubkey))

  const signature = Signature.from(privKey, Buffer.from(tx.serialize()))
  tx.addSignature(signature)
  t.true(tx.isSignedBy(pubkey))
})
