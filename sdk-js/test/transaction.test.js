import test from 'ava'
import {
  Transaction,
  CallInstruction,
  LoadInstruction,
  LockInstruction,
  NewInstruction,
  StringArg,
  PrivKey,
  NumberArg,
  Signature, VariableContent,
  AssignInstruction
} from '../dist/index.js'

// test.before(t => {})

test('serialize for empy tx returns empty string', t => {
  const tx = new Transaction()
  t.true(tx.serialize() === '')
})

test('serializes correctly an assign instruction', t => {
  const tx = new Transaction()
    .add(new AssignInstruction('someVar', 101))
  t.is(tx.serialize(), 'ASSIGN someVar 101')
})

test('serialize return right string for only a load line', t => {
  const tx = new Transaction()
    .add(new LoadInstruction('foo', 'someLocation', true, false))
  t.is(tx.serialize(), 'LOAD foo someLocation true false')
})

test('serialize return right string for only a new line', t => {
  const tx = new Transaction()
    .add(new NewInstruction('someVar', 'somemodule', 'SomeClass', [new VariableContent('someVar'), new StringArg('foo')]))

  t.is(tx.serialize(), 'NEW someVar somemodule SomeClass $someVar "foo"')
})

test('serialize return right string for only a call instruction', t => {
  const tx = new Transaction()
    .add(new CallInstruction('someJig', 'foo', [new VariableContent('someVar'), new StringArg('foo')]))
  t.is(tx.serialize(), 'CALL $someJig foo $someVar "foo"')
})

test('serialize return correct string for only a LockInstructon', t => {
  const pubkey = PrivKey.fromRandom().toPubKey()
  const tx = new Transaction()
    .add(new LockInstruction('someVar', pubkey))

  t.is(tx.serialize(), `LOCK $someVar ${pubkey.toHex()}`)
})

test('serialize return corrent string for multiple instructions', t => {
  const pubkey = PrivKey.fromRandom().toPubKey()
  const tx = new Transaction()
    .add(new LoadInstruction('firstVar', 'someLocation', true))
    .add(new AssignInstruction('assignedVar', 73))
    .add(new NewInstruction('newVar', 'someModule', 'SomeClass', [new VariableContent('jig1'), new StringArg('foo')]))
    .add(new CallInstruction('someVar', 'someMethod', [new VariableContent('jig3'), new NumberArg(10)]))
    .add(new LockInstruction('otherVar', pubkey))

  t.is(tx.serialize(), [
    'LOAD firstVar someLocation true false',
    'ASSIGN assignedVar 73',
    'NEW newVar someModule SomeClass $jig1 "foo"',
    'CALL $someVar someMethod $jig3 10',
    `LOCK $otherVar ${pubkey.toHex()}`
  ].join('\n'))
})


test('after sign is signed by a given signature', t => {
  const privKey = PrivKey.fromRandom()
  const pubkey = privKey.toPubKey()
  const tx = new Transaction()
    .add(new LoadInstruction('someVar', 'somelocation', true))
    .add(new LockInstruction('someVar', pubkey))

  const signature = Signature.from(privKey, Buffer.from(tx.serialize()))
  tx.addSignature(signature)
  t.true(tx.isSignedBy(pubkey))
})

test('toPlainObject returns a correctly serialized plain object', t => {
  const privKey = PrivKey.fromRandom()
  const pubkey = privKey.toPubKey()
  const tx = new Transaction()
    .add(new LoadInstruction('firstVar', 'someLocation', true))
    .add(new AssignInstruction('assignedVar', 73))
    .add(new NewInstruction('newVar', 'someModule', 'SomeClass', [new VariableContent('jig1'), new StringArg('foo')]))
    .add(new CallInstruction('someVar', 'someMethod', [new VariableContent('jig3'), new NumberArg(10)]))
    .add(new LockInstruction('otherVar', pubkey))

  const signature = Signature.from(privKey, Buffer.from(tx.serialize()))
  tx.addSignature(signature)

  const serialized = tx.toPlainObject()
  t.is(serialized.instructions.length, 5)
  t.deepEqual(serialized.instructions, [
    {
      type: 'load',
      props: {
        varName: 'firstVar', location: 'someLocation', force: false, readOnly: true
      }
    },
    {
      type: 'assign',
      props: {
        varName: 'assignedVar', index: 73
      }
    },
    {
      type: 'new',
      props: {
        varName: 'newVar',
        moduleId: 'someModule',
        className: 'SomeClass',
        args: [{type: 'variableContent', value: 'jig1'}, {type: 'string', value: 'foo'}]
      }
    },
    {
      type: 'call',
      props: {
        varName: 'someVar',
        methodName: 'someMethod',
        args: [{type: 'variableContent', value: 'jig3'}, {type: 'number', value: 10}]
      }
    },
    {
      type: 'lock',
      props: {
        varName: 'otherVar',
        pubKey: pubkey.toHex()
      }
    }
  ])
  t.is(serialized.signatures.length, 1)

  t.deepEqual(serialized.signatures, [
    {
      pubKey: pubkey.toHex(),
      hexSig: signature.rawSigHex()
    }
  ])
})

test('fromPlainObject generates a correct signature', t => {
  const privKey = PrivKey.fromRandom()
  const pubkey = privKey.toPubKey()
  const tx = new Transaction()
    .add(new LoadInstruction('firstVar', 'someLocation', true))
    .add(new AssignInstruction('assignedVar', 73))
    .add(new NewInstruction('newVar', 'someModule', 'SomeClass', [new VariableContent('jig1'), new StringArg('foo')]))
    .add(new CallInstruction('someVar', 'someMethod', [new VariableContent('jig3'), new NumberArg(10)]))
    .add(new LockInstruction('otherVar', pubkey))


  const signature = Signature.from(privKey, Buffer.from(tx.serialize()))
  tx.addSignature(signature)

  const plainObj = tx.toPlainObject()
  const parsedTx = Transaction.fromPlainObject(plainObj)

  t.deepEqual(tx.serialize(), parsedTx.serialize())

  t.is(parsedTx.instructions.length, 5)
  t.true(parsedTx.isSignedBy(pubkey))
  t.true(parsedTx.signaturesAreValid())
})
