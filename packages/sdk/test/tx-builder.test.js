import test from 'ava'
import { mockAldea  } from './test-helpers.js'

import { Aldea, Address, BCS, KeyPair, OpCode, ref, TxBuilder } from '../dist/index.js'

test.before(t => {
  const aldea = new Aldea('http://localhost')
  const keys = KeyPair.fromRandom()
  mockAldea(aldea, mock => {
    mock.get('http://localhost/package/a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701/abi.json', { file: 'test/mocks/txb.pkg.json', format: 'string' })
    mock.get('http://localhost/package/0000000000000000000000000000000000000000000000000000000000000000/abi.json', { file: 'test/mocks/pkg.coin.json', format: 'string' })
    mock.get('http://localhost/output/df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d', { file: 'test/mocks/txb.coin.json', format: 'string' })
    mock.get('http://localhost/output-by-origin/675d72e2d567cbe2cb9ef3230cbc4c85e42bcd56ba537f6b65a51b9c6c855281_1', { file: 'test/mocks/txb.jig.json', format: 'string' })
  })
  t.context.aldea = aldea
  t.context.addr = Address.fromPubKey(keys.pubKey)
  t.context.keys = keys
})

test('TxBuilder.push adds instruction build step', async t => {
  const tx = await t.context.aldea.createTx((txb) => {
    const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
    txb.push(function(txb, className) {
      return TxBuilder.newInstruction(txb, ref(0), className, ['bar'])
    }, 'Badge')
  })

  t.is(tx.instructions.length, 2)
  t.is(tx.instructions[0].opcode, OpCode.IMPORT)
  t.is(tx.instructions[1].opcode, OpCode.NEW)
})

test('TxBuilder.push cannot be invoked during build', async t => {
  await t.throwsAsync(() => {
    return t.context.aldea.createTx((txb) => {
      const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
      txb.push(function(txb, className) {
        txb.new(ref(0), 'Badge', ['foo'])
        return TxBuilder.newInstruction(txb, ref(0), className, ['bar'])
      }, 'Badge')
    })
  }, { message: /cannot call TxBuilder\.push/ })
})

test('extend option concatenates a single tx', async t => {
  const tx1 = await t.context.aldea.createTx((txb) => {
    const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
    txb.new(pkg, 'Badge', ['foo'])
  })

  const tx2 = await t.context.aldea.createTx({ extend: tx1 }, (txb) => {
    const coin = txb.load('df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d')
    txb.call(coin, 'send', [700, t.context.addr.hash])
  })

  t.is(tx2.instructions.length, 4)
  t.is(tx2.instructions[0].opcode, OpCode.IMPORT)
  t.is(tx2.instructions[1].opcode, OpCode.NEW)
  t.is(tx2.instructions[2].opcode, OpCode.LOAD)
  t.is(tx2.instructions[3].opcode, OpCode.CALL)
})

test('extend option concatenates chains of txns', async t => {
  const tx1 = await t.context.aldea.createTx((txb) => {
    const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
    txb.new(pkg, 'Badge', ['foo'])
  })

  const tx2 = await t.context.aldea.createTx({ extend: tx1 }, (txb) => {
    const coin = txb.load('df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d')
    txb.call(coin, 'send', [700, t.context.addr.hash])
  })

  const tx3 = await t.context.aldea.createTx({ extend: tx2 }, (txb, ref) => {
    txb.fund(ref(3))
    txb.sign(t.context.keys.privKey)
  })

  t.is(tx3.instructions.length, 6)
  t.is(tx2.instructions[0].opcode, OpCode.IMPORT)
  t.is(tx2.instructions[1].opcode, OpCode.NEW)
  t.is(tx2.instructions[2].opcode, OpCode.LOAD)
  t.is(tx2.instructions[3].opcode, OpCode.CALL)
  t.is(tx3.instructions[4].opcode, OpCode.FUND)
  t.is(tx3.instructions[5].opcode, OpCode.SIGN)
})

test('hook option allows instructions to be mutated', async t => {
  const tx1 = await t.context.aldea.createTx({
    onBuild: (txb, instruction, i) => {
      if (i === 1) {
        return TxBuilder.newInstruction(txb, ref(0), 'Badge', ['bar'])
      }
    }
  }, (txb) => {
    const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
    txb.new(pkg, 'Badge', ['foo'])
  })

  const abi = await t.context.aldea.getPackageAbi('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
  const bcs = new BCS(abi)

  // arg is bar
  t.deepEqual(bcs.decode('Badge_constructor', tx1.instructions[1].argsBuf), ['bar'])
})

test('hook option throws error if instruction mismatch', async t => {
  await t.throwsAsync(() => {
    return t.context.aldea.createTx({
      onBuild: (txb, instruction, i) => {
        if (i === 0) {
          return TxBuilder.loadInstruction(txb, 'df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d')
        }
      }
    }, (txb) => {
      const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
      txb.new(pkg, 'Badge', ['foo'])
    })
  }, { message: /txbuilder hook instruction mismatch/i })
})

test('resign option adds resigning hook', async t => {
  const tx1 = await t.context.aldea.createTx((txb) => {
    const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
    txb.new(pkg, 'Badge', ['foo'])
    txb.sign(t.context.keys.privKey)
  })

  const oldSig = tx1.instructions[2].sig
  
  const tx2 = await t.context.aldea.createTx({
    extend: tx1,
    updateSigs: t.context.keys.privKey
  }, (txb) => {
    const coin = txb.load('df4cf424923ad248766251066fa4a408930faf94fff66c77657e79f604d3120d')
    txb.call(coin, 'send', [700, t.context.addr.hash])
  })

  const newSig = tx2.instructions[2].sig

  t.is(oldSig.length, 64)
  t.is(newSig.length, 64)
  t.notDeepEqual(newSig, oldSig)
})

test.only('verifies all the signatures in a built transaction', async t => {
  const tx1 = await t.context.aldea.createTx((txb) => {
    const pkg = txb.import('a0b07c4143ae6f105ea79cff5d21d2d1cd09351cf66e41c3e43bfb3bddb1a701')
    txb.new(pkg, 'Badge', ['foo'])
    txb.signTo(t.context.keys.privKey)
    txb.sign(t.context.keys.privKey)
    txb.new(pkg, 'Badge', ['a'])
    txb.new(pkg, 'Badge', ['b'])
    txb.new(pkg, 'Badge', ['c'])
    txb.sign(t.context.keys.privKey)
  })

  t.true(tx1.verify())
})