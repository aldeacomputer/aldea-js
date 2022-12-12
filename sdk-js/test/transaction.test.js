import test from 'ava'
import { PrivKey } from '../dist/index.js'
import { TxBuilder } from '../dist/tx-builder-old.js'
import { base16 } from "@scure/base"

const someLocation = base16.decode(new Array(72).fill('0').join(''))
const somePrivKey = PrivKey.fromRandom()
const someAddr = somePrivKey.toPubKey().toAddress()

test('isSignedBy() returns false for empty tx', t => {
  const tx = new TxBuilder().build()

  t.false(tx.isSignedBy(someAddr, 0))
})

test('isSignedBy() returns true when tx was signed in an index before the signature', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .sign(somePrivKey)
    .build()

  t.true(tx.isSignedBy(someAddr, 0))
})

test('isSignedBy() returns true when tx was signed in an index after the signature', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .sign(somePrivKey)
    .new(0, 1, [])
    .build()

  t.true(tx.isSignedBy(someAddr, 2))
})

test('isSignedBy() returns false when the signature is actually not present', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .sign(somePrivKey)
    .new(0, 1, [])
    .build()

  const otherAddress = PrivKey.fromRandom().toPubKey().toAddress()
  t.false(tx.isSignedBy(otherAddress, 2))
})

test('isSignedBy() returns true when partial signature happened after the index', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .signTo(somePrivKey)
    .new(0, 1, [])
    .build()

  t.true(tx.isSignedBy(someAddr, 0))
})

test('isSignedBy() returns false when partial signature happened after the index', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .signTo(somePrivKey)
    .new(0, 1, [])
    .build()

  t.false(tx.isSignedBy(someAddr, 2))
})

test('isSignedBy() returns true when partial signature happened just at the index', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .signTo(somePrivKey)
    .new(0, 1, [])
    .build()

  t.true(tx.isSignedBy(someAddr, 1))
})

test('isSignedBy() returns false when partial signature happened after the index but the address is wrong', t => {
  const tx = new TxBuilder()
    .import(someLocation)
    .signTo(somePrivKey)
    .new(0, 1, [])
    .build()

  const otherAddress = PrivKey.fromRandom().toPubKey().toAddress()
  t.false(tx.isSignedBy(otherAddress, 0))
})
